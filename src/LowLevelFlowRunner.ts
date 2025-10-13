import { SpecEdge, SpecFlow, SpecNode } from './flow-spec.js';
import { eventEmitter } from './events.js';
import { NodeReport } from './components/popup/flowRunStore.js';
import { FlowRunnerDependencies, NodeExecutor, NodeExecutorContext } from './NodeExecutor.js';
import { FlowTerminationError } from './components/nodes/EndNode/definition.js';

export interface ExecutionReport {
  executedNodes: {
    nodeId: string;
    type: string | undefined;
    input: Record<string, any>;
    output: any;
  }[];
  error?: {
    nodeId: string;
    message: string;
  };
  lastOutput?: any;
}

export class LowLevelFlowRunner {
  constructor(private nodeExecutors: Map<string, NodeExecutor>) {}

  public async executeFlow(
    runId: string,
    flow: SpecFlow,
    initialInput: Record<string, any>,
    dependencies: FlowRunnerDependencies,
    depth: number,
    signal?: AbortSignal,
  ): Promise<ExecutionReport> {
    console.log(`[FlowChart] Executing flow (runId: ${runId}, depth: ${depth}) with args`, initialInput);

    const nodeOutputs: Record<string, any> = {};
    const executionVariables = new Map<string, any>();
    const report: ExecutionReport = { executedNodes: [] };
    let lastOutput: any = undefined;

    const inDegree: Record<string, number> = {};
    const adj = new Map<string, SpecEdge[]>(flow.nodes.map((node) => [node.id, []]));
    const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));

    for (const node of flow.nodes) {
      inDegree[node.id] = 0;
    }
    for (const edge of flow.edges) {
      if (nodesById.has(edge.source) && nodesById.has(edge.target)) {
        inDegree[edge.target]++;
        adj.get(edge.source)!.push(edge);
      }
    }

    const queue = flow.nodes.filter((node) => inDegree[node.id] === 0).map((node) => node.id);

    try {
      while (queue.length > 0) {
        if (signal?.aborted) {
          throw new Error('Flow execution was aborted by the user.');
        }
        const nodeId = queue.shift()!;
        const node = nodesById.get(nodeId)!;

        // Skip disabled nodes, but pass control flow through
        if (node.data?.disabled) {
          nodeOutputs[nodeId] = {};
          report.executedNodes.push({ nodeId: node.id, type: node.type, input: {}, output: '[DISABLED]' });
          const outgoingEdges = adj.get(nodeId) || [];
          for (const edge of outgoingEdges) {
            inDegree[edge.target]--;
            if (inDegree[edge.target] === 0) queue.push(edge.target);
          }
          continue;
        }

        const isRootNode = !flow.edges.some((e) => e.target === nodeId);
        const baseInput = isRootNode ? initialInput : {};
        const inputs = this.getNodeInputs(node, flow.edges, nodeOutputs, baseInput);

        eventEmitter.emit('node:run:start', { runId, nodeId });
        const nodeReport: NodeReport = { status: 'completed', input: inputs, output: {}, error: undefined };

        try {
          const output = await this.executeNode(node, inputs, {
            flow,
            dependencies,
            executionVariables,
            depth,
          });
          nodeReport.output = output;
        } catch (error: any) {
          if (error instanceof FlowTerminationError) {
            console.log(`[FlowChart] Flow terminated gracefully by EndNode ${node.id}.`);
            nodeReport.output = {};
            lastOutput = {};
            report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: '[TERMINATED]' });
            report.lastOutput = lastOutput;
            return report; // Graceful exit
          }
          nodeReport.status = 'error';
          nodeReport.error = error.message;
          nodeReport.output = null;
        }

        nodeOutputs[nodeId] = nodeReport.output;
        lastOutput = nodeReport.output;
        report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: nodeReport.output });
        eventEmitter.emit('node:run:end', { runId, nodeId: node.id, report: nodeReport });

        if (nodeReport.status === 'error') {
          const enhancedError = new Error(nodeReport.error);
          (enhancedError as any).nodeId = node.id;
          throw enhancedError;
        }

        const outgoingEdges = adj.get(nodeId) || [];
        let edgesToFollow = outgoingEdges;

        if (node.type === 'ifNode' && nodeReport.output?.activatedHandle) {
          edgesToFollow = outgoingEdges.filter((edge) => edge.sourceHandle === nodeReport.output.activatedHandle);
        }

        for (const edge of edgesToFollow) {
          const neighborId = edge.target;
          if (inDegree[neighborId] !== undefined) {
            inDegree[neighborId]--;
            if (inDegree[neighborId] === 0) {
              queue.push(neighborId);
            }
          }
        }
      }
    } catch (error: any) {
      const isAbort = error instanceof Error && error.message.includes('aborted');
      if (!isAbort) {
        console.error('[FlowChart] Flow execution aborted due to an error.', error);
      }
      report.error = {
        nodeId: (error as any).nodeId || 'unknown',
        message: error.message || String(error),
      };
    }

    report.lastOutput = lastOutput;
    console.log('[FlowChart] Flow execution finished.');
    return report;
  }

  private getNodeInputs(
    node: SpecNode,
    edges: SpecEdge[],
    nodeOutputs: Record<string, any>,
    baseInput: Record<string, any>,
  ): Record<string, any> {
    const inputs: Record<string, any> = { ...baseInput };
    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    for (const edge of incomingEdges) {
      const sourceOutput = nodeOutputs[edge.source];
      if (sourceOutput === undefined) continue;

      const targetHandle = edge.targetHandle;
      if (!targetHandle) {
        Object.assign(inputs, sourceOutput);
        continue;
      }

      const sourceHandle = edge.sourceHandle;
      if (
        sourceHandle &&
        typeof sourceOutput === 'object' &&
        sourceOutput !== null &&
        sourceOutput[sourceHandle] !== undefined
      ) {
        inputs[targetHandle] = sourceOutput[sourceHandle];
      } else {
        inputs[targetHandle] = sourceOutput;
      }
    }
    return inputs;
  }

  private async executeNode(node: SpecNode, input: Record<string, any>, context: NodeExecutorContext): Promise<any> {
    if (node.type === 'groupNode') return {};

    const executor = this.nodeExecutors.get(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type "${node.type}". Make sure it's registered correctly.`);
    }

    try {
      return await executor(node, input, context);
    } catch (error) {
      if (error instanceof FlowTerminationError) {
        throw error; // Re-throw to be caught by the main loop
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      const enhancedError = new Error(`Execution failed at node ${node.id} (${node.type}): ${errorMessage}`);
      (enhancedError as any).nodeId = node.id;
      throw enhancedError;
    }
  }
}
