import { FC, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  Node,
  OnConnectStartParams,
} from '@xyflow/react';
import { FlowProvider, useFlow } from './FlowContext.js';
import { TriggerNode } from '../nodes/TriggerNode.js';
import { IfNode } from '../nodes/IfNode.js';
import { CreateMessagesNode } from '../nodes/CreateMessagesNode.js';
import { CustomMessageNode } from '../nodes/CustomMessageNode.js';
import { MergeMessagesNode } from '../nodes/MergeMessagesNode.js';
import { StringNode } from '../nodes/StringNode.js';
import { NumberNode } from '../nodes/NumberNode.js';
import { StructuredRequestNode } from '../nodes/StructuredRequestNode.js';
import { SchemaNode } from '../nodes/SchemaNode.js';
import { ProfileIdNode } from '../nodes/ProfileIdNode.js';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { STButton, STPresetSelect, type PresetItem } from 'sillytavern-utils-lib/components';
import { NodePalette, availableNodes } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow } from '../../config.js';
import { NodeHandleTypes, checkConnectionValidity } from '../../flow-types.js';
import { CreateCharacterNode } from '../nodes/CreateCharacterNode.js';
import { EditCharacterNode } from '../nodes/EditCharacterNode.js';

type AddNodeContextMenu = {
  x: number;
  y: number;
  options: {
    label: string;
    action: () => void;
  }[];
};

const FlowCanvas: FC<{ invalidNodeIds: Set<string> }> = ({ invalidNodeIds }) => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect: baseOnConnect, addNode } = useFlow();
  const { screenToFlowPosition } = useReactFlow();
  const connectingNode = useRef<OnConnectStartParams | null>(null);
  const [contextMenu, setContextMenu] = useState<AddNodeContextMenu | null>(null);
  const wasConnectionSuccessful = useRef(false);

  const nodeTypes = useMemo(
    () => ({
      triggerNode: TriggerNode,
      ifNode: IfNode,
      createMessagesNode: CreateMessagesNode,
      customMessageNode: CustomMessageNode,
      mergeMessagesNode: MergeMessagesNode,
      stringNode: StringNode,
      numberNode: NumberNode,
      structuredRequestNode: StructuredRequestNode,
      schemaNode: SchemaNode,
      profileIdNode: ProfileIdNode,
      createCharacterNode: CreateCharacterNode,
      editCharacterNode: EditCharacterNode,
    }),
    [],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => checkConnectionValidity(connection, nodes),
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      wasConnectionSuccessful.current = true;
      baseOnConnect(connection);
    },
    [baseOnConnect],
  );

  const onConnectStart = useCallback((_: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
    connectingNode.current = params;
    wasConnectionSuccessful.current = false;
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent) => {
      if (!connectingNode.current) return;

      if (wasConnectionSuccessful.current) {
        connectingNode.current = null;
        wasConnectionSuccessful.current = false;
        return;
      }

      const { nodeId: startNodeId, handleId: startHandleId, handleType } = connectingNode.current;
      if (!startNodeId || !handleType) {
        connectingNode.current = null;
        return;
      }

      const startNode = nodes.find((n) => n.id === startNodeId);
      if (!startNode || !startNode.type) {
        connectingNode.current = null;
        return;
      }

      const findCompatibleNodes = () => {
        const candidates: { nodeType: string; nodeLabel: string; connectToHandle: string | null }[] = [];

        if (handleType === 'source') {
          for (const nodeDef of availableNodes) {
            const targetInputs = NodeHandleTypes[nodeDef.type]?.inputs;
            if (!targetInputs) continue;
            for (const targetHandle of targetInputs) {
              const tempTargetNode: Node = {
                id: 'temp',
                type: nodeDef.type,
                position: { x: 0, y: 0 },
                data: structuredClone(nodeDef.data),
              };
              if (
                checkConnectionValidity(
                  { source: startNodeId, sourceHandle: startHandleId, target: 'temp', targetHandle: targetHandle.id },
                  [...nodes, tempTargetNode],
                )
              ) {
                candidates.push({
                  nodeType: nodeDef.type,
                  nodeLabel: nodeDef.label,
                  connectToHandle: targetHandle.id,
                });
              }
            }
          }
        } else {
          for (const nodeDef of availableNodes) {
            const sourceOutputs = NodeHandleTypes[nodeDef.type]?.outputs;
            if (!sourceOutputs) continue;
            for (const sourceHandle of sourceOutputs) {
              const tempSourceNode: Node = {
                id: 'temp',
                type: nodeDef.type,
                position: { x: 0, y: 0 },
                data: structuredClone(nodeDef.data),
              };
              if (
                checkConnectionValidity(
                  { source: 'temp', sourceHandle: sourceHandle.id, target: startNodeId, targetHandle: startHandleId },
                  [...nodes, tempSourceNode],
                )
              ) {
                candidates.push({
                  nodeType: nodeDef.type,
                  nodeLabel: nodeDef.label,
                  connectToHandle: sourceHandle.id,
                });
              }
            }
          }
        }
        return Array.from(new Map(candidates.map((item) => [item.nodeType, item])).values());
      };

      const compatibleNodes = findCompatibleNodes();
      connectingNode.current = null;
      if (compatibleNodes.length === 0) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const createAndConnectNode = (nodeType: string, connectToHandle: string | null) => {
        const nodeDef = availableNodes.find((n) => n.type === nodeType);
        if (!nodeDef) return;

        const newNode = addNode({ type: nodeType, position, data: structuredClone(nodeDef.data) });
        const connection =
          handleType === 'source'
            ? { source: startNodeId, sourceHandle: startHandleId, target: newNode.id, targetHandle: connectToHandle }
            : { source: newNode.id, sourceHandle: connectToHandle, target: startNodeId, targetHandle: startHandleId };
        onConnect(connection);
      };

      if (compatibleNodes.length === 1) {
        createAndConnectNode(compatibleNodes[0].nodeType, compatibleNodes[0].connectToHandle);
      } else {
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          options: compatibleNodes.map(({ nodeType, nodeLabel, connectToHandle }) => ({
            label: nodeLabel,
            action: () => {
              createAndConnectNode(nodeType, connectToHandle);
              setContextMenu(null);
            },
          })),
        });
      }
    },
    [nodes, screenToFlowPosition, addNode, onConnect, setContextMenu],
  );

  const nodesWithInvalidClass = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className: invalidNodeIds.has(node.id) ? 'flow-node-invalid' : '',
      })),
    [nodes, invalidNodeIds],
  );

  return (
    <div className="flowchart-popup-ground" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodesWithInvalidClass}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd as any}
        onPaneClick={() => {}}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        isValidConnection={isValidConnection}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {contextMenu && (
        <div
          className="flowchart-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, zIndex: 999, position: 'fixed' }}
        >
          <ul>
            {contextMenu.options.map((option) => (
              <li key={option.label} onClick={option.action}>
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const FlowManager: FC = () => {
  const { nodes, edges, loadFlow, getFlowData } = useFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save effect
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFlowData = getFlowData();
      settings.flows[settings.activeFlow] = structuredClone(currentFlowData);
      settingsManager.saveSettings();
      flowRunner.reinitialize();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, settings.activeFlow, getFlowData]);

  const { isValid, errors, invalidNodeIds, invalidEdgeIds } = useMemo(
    () => validateFlow({ nodes, edges }),
    [nodes, edges],
  );

  const presetItems = useMemo(
    () => Object.keys(settings.flows).map((key) => ({ value: key, label: key })),
    [settings.flows],
  );

  const handleSelectChange = (newValue?: string) => {
    if (newValue && settings.flows[newValue]) {
      settings.activeFlow = newValue;
      loadFlow(structuredClone(settings.flows[newValue]));
      forceUpdate();
    }
  };

  const handleItemsChange = (newItems: PresetItem[]) => {
    const newFlows: Record<string, any> = {};
    let activeFlowExists = false;

    for (const item of newItems) {
      newFlows[item.value] = settings.flows[item.value] || createDefaultFlow();
      if (item.value === settings.activeFlow) {
        activeFlowExists = true;
      }
    }
    settings.flows = newFlows;

    if (!activeFlowExists) {
      settings.activeFlow = newItems[0]?.value || '';
      if (settings.activeFlow) {
        loadFlow(structuredClone(settings.flows[settings.activeFlow]));
      } else {
        loadFlow({ nodes: [], edges: [] });
      }
    }
    forceUpdate();
  };

  const handleCreate = (newValue: string) => {
    if (settings.flows[newValue]) {
      st_echo('error', `A flow named "${newValue}" already exists.`);
      return { confirmed: false };
    }
    return { confirmed: true, value: newValue };
  };

  const handleRename = (oldValue: string, newValue: string) => {
    if (settings.flows[newValue]) {
      st_echo('error', `A flow named "${newValue}" already exists.`);
      return { confirmed: false };
    }
    settings.flows[newValue] = settings.flows[oldValue];
    delete settings.flows[oldValue];
    if (settings.activeFlow === oldValue) {
      settings.activeFlow = newValue;
    }
    forceUpdate();
    return { confirmed: true };
  };

  const handleClearInvalid = () => {
    const newNodes = nodes.filter((node) => !invalidNodeIds.has(node.id));
    const newEdges = edges.filter((edge) => !invalidEdgeIds.has(edge.id));
    loadFlow({ nodes: newNodes, edges: newEdges });
  };

  return (
    <div className="flowchart-ground-manager">
      <div className="flowchart-preset-selector">
        <STPresetSelect
          label="Flow"
          value={settings.activeFlow}
          items={presetItems}
          onChange={handleSelectChange}
          onItemsChange={handleItemsChange}
          onCreate={handleCreate}
          onRename={handleRename}
          enableCreate
          enableRename
          enableDelete
        />
      </div>
      {!isValid && (
        <div className="flowchart-errors">
          <div className="flowchart-errors-header">
            <strong>Flow is invalid:</strong>
            <STButton color="danger" onClick={handleClearInvalid}>
              Clear Invalid Items
            </STButton>
          </div>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flowchart-editor-area">
        <NodePalette />
        <FlowCanvas invalidNodeIds={invalidNodeIds} />
      </div>
    </div>
  );
};

export const FlowChartGround: FC = () => {
  return (
    <FlowProvider>
      <ReactFlowProvider>
        <FlowManager />
      </ReactFlowProvider>
    </FlowProvider>
  );
};
