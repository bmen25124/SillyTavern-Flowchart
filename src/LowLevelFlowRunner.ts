import { SpecEdge, SpecFlow, SpecNode } from './flow-spec.js';
import { eventEmitter } from './events.js';
import { NodeReport } from './components/popup/flowRunStore.js';
import { FlowRunnerDependencies, NodeExecutor, NodeExecutorContext } from './NodeExecutor.js';
import { END_NODE_SENTINEL } from './components/nodes/EndNode/definition.js';
import { registrator } from './components/nodes/autogen-imports.js';

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
    options: { startNodeId?: string; endNodeId?: string } = {},
  ): Promise<ExecutionReport> {
    console.log(`[FlowChart] Executing flow (runId: ${runId}, depth: ${depth}) with args`, initialInput);

    const nodeOutputs: Record<string, any> = {};
    const executionVariables = new Map<string, any>();
    const report: ExecutionReport = { executedNodes: [] };
    let lastOutput: any = undefined;

    let nodesToExecute = flow.nodes;
    let edgesToExecute = flow.edges;

    // If 'Run To Here' is used, we calculate the subgraph of all ancestors of the target node.
    // Execution will be constrained to only this subgraph.
    if (options.endNodeId) {
      const ancestorSet = new Set<string>();
      const backwardQueue: string[] = [options.endNodeId];
      ancestorSet.add(options.endNodeId);

      // Create a reverse adjacency list to traverse backwards from the target.
      const revAdj = new Map<string, string[]>();
      flow.nodes.forEach((node) => revAdj.set(node.id, []));
      flow.edges.forEach((edge) => {
        revAdj.get(edge.target)?.push(edge.source);
      });

      while (backwardQueue.length > 0) {
        const currentNodeId = backwardQueue.shift()!;
        const parents = revAdj.get(currentNodeId) || [];
        for (const parentId of parents) {
          if (!ancestorSet.has(parentId)) {
            ancestorSet.add(parentId);
            backwardQueue.push(parentId);
          }
        }
      }

      nodesToExecute = flow.nodes.filter((node) => ancestorSet.has(node.id));
      edgesToExecute = flow.edges.filter((edge) => ancestorSet.has(edge.source) && ancestorSet.has(edge.target));
    }

    const inDegree: Record<string, number> = {};
    const adj = new Map<string, SpecEdge[]>(nodesToExecute.map((node) => [node.id, []]));
    const nodesById = new Map(nodesToExecute.map((node) => [node.id, node]));

    for (const node of nodesToExecute) {
      inDegree[node.id] = 0;
    }
    for (const edge of edgesToExecute) {
      if (nodesById.has(edge.source) && nodesById.has(edge.target)) {
        inDegree[edge.target]++;
        adj.get(edge.source)!.push(edge);
      }
    }

    const queue: string[] = [];
    if (options.startNodeId) {
      const startNode = nodesById.get(options.startNodeId);
      if (!startNode) {
        throw new Error(`Start node with ID "${options.startNodeId}" not found.`);
      }
      queue.push(options.startNodeId);
    } else {
      queue.push(...nodesToExecute.filter((node) => inDegree[node.id] === 0).map((node) => node.id));
    }

    try {
      while (queue.length > 0) {
        if (signal?.aborted) {
          throw new DOMException('Flow execution was aborted.', 'AbortError');
        }
        const nodeId = queue.shift()!;
        const node = nodesById.get(nodeId)!;

        // Skip disabled nodes, but pass control flow through
        if (node.data?.disabled) {
          continue;
        }

        const isRootNode = !edgesToExecute.some((e) => e.target === nodeId);
        const isExplicitStart = nodeId === options.startNodeId;
        const baseInput = isRootNode || isExplicitStart ? initialInput : {};
        const inputs = this.getNodeInputs(node, edgesToExecute, nodeOutputs, baseInput, nodesById, options.startNodeId);

        eventEmitter.emit('node:run:start', { runId, nodeId });
        const nodeReport: NodeReport = { status: 'completed', input: inputs, output: {}, error: undefined };

        try {
          let outputFromExecutor = await this.executeNode(node, inputs, {
            flow,
            dependencies,
            executionVariables,
            depth,
            signal,
          });

          if (outputFromExecutor === END_NODE_SENTINEL) {
            console.log(`[FlowChart] Flow terminated gracefully by EndNode ${node.id}.`);
            nodeReport.output = {};
            lastOutput = {};
            report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: '[TERMINATED]' });
            report.lastOutput = lastOutput;
            return report; // Graceful exit
          }

          const definition = registrator.nodeDefinitionMap.get(node.type);
          const isPassthrough =
            definition?.handles.inputs.some((h) => h.id === 'main') &&
            definition?.handles.outputs.some((h) => h.id === 'main');

          let finalOutput = outputFromExecutor;

          if (isPassthrough) {
            const passthroughValue = inputs.main;
            if (typeof outputFromExecutor === 'object' && outputFromExecutor !== null) {
              finalOutput = { ...outputFromExecutor, main: passthroughValue };
            } else {
              // If executor returns undefined/null, the output is just the passthrough.
              // Otherwise, we assume it's a single 'result' value alongside the passthrough.
              const newOutputs = outputFromExecutor !== undefined ? { result: outputFromExecutor } : {};
              finalOutput = { ...newOutputs, main: passthroughValue };
            }
          }

          nodeReport.output = finalOutput;
        } catch (error: any) {
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

        if (nodeId === options.endNodeId) {
          console.log(`[FlowChart] Flow execution stopped at designated node ${nodeId}.`);
          break;
        }

        const outgoingEdges = adj.get(nodeId) || [];
        let edgesToFollow = outgoingEdges;

        if (['ifNode', 'confirmUserNode'].includes(node.type) && nodeReport.output?.activatedHandle) {
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
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
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
    nodesById: Map<string, SpecNode>,
    startNodeId?: string,
  ): Record<string, any> {
    const inputs: Record<string, any> = { ...baseInput };

    if (node.id === startNodeId) {
      return inputs;
    }

    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    for (const edge of incomingEdges) {
      if (!Object.prototype.hasOwnProperty.call(nodeOutputs, edge.source)) {
        const sourceNode = nodesById.get(edge.source);
        const sourceNodeType = sourceNode?.type ?? 'unknown';
        throw new Error(
          `Required input for handle "${
            edge.targetHandle ?? 'default'
          }" is missing. Its source node "${sourceNodeType} (${edge.source})" was not executed.`,
        );
      }

      const sourceOutput = nodeOutputs[edge.source];
      const sourceNode = nodesById.get(edge.source);

      if (sourceOutput === undefined || typeof sourceOutput !== 'object' || sourceOutput === null) {
        continue;
      }

      const handleKey = edge.targetHandle ?? 'main';
      let valueToPass;

      if (sourceNode?.type === 'ifNode') {
        // For an If node, the data always comes from its 'main' output property,
        // which contains the passthrough value. The sourceHandle is just for routing.
        valueToPass = sourceOutput.main;
      } else {
        const sourceHandle = edge.sourceHandle ?? 'result';
        valueToPass = sourceOutput[sourceHandle];
      }

      inputs[handleKey] = valueToPass;
    }
    return inputs;
  }

  private async executeNode(node: SpecNode, input: Record<string, any>, context: NodeExecutorContext): Promise<any> {
    const executor = this.nodeExecutors.get(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type "${node.type}". Make sure it's registered correctly.`);
    }

    try {
      return await executor(node, input, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const enhancedError = new Error(`Execution failed at node ${node.id} (${node.type}): ${errorMessage}`);
      (enhancedError as any).nodeId = node.id;
      throw enhancedError;
    }
  }
}
