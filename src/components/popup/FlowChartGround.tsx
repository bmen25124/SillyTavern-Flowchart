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
  getNodesBounds,
  getViewportForBounds,
  useEdges,
  MiniMap,
} from '@xyflow/react';
import { FlowProvider, useFlow } from './FlowContext.js';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { STButton, STPresetSelect, type PresetItem } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow } from '../../config.js';
import { checkConnectionValidity } from '../../flow-types.js';
import { toPng } from 'html-to-image';
import { allNodeDefinitions, nodeDefinitionMap, nodeTypes } from '../nodes/definitions/index.js';
import { useDebugStore } from './DebugPanel.js';

type AddNodeContextMenu = {
  x: number;
  y: number;
  options: {
    label: string;
    action: () => void;
  }[];
};

const FlowCanvas: FC<{ invalidNodeIds: Set<string> }> = ({ invalidNodeIds }) => {
  const { nodes, onNodesChange, onEdgesChange, onConnect: baseOnConnect, addNode } = useFlow();
  const reactFlowEdges = useEdges();
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const connectingNode = useRef<OnConnectStartParams | null>(null);
  const [contextMenu, setContextMenu] = useState<AddNodeContextMenu | null>(null);
  const wasConnectionSuccessful = useRef(false);
  const { activeNodeId } = useDebugStore();

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => checkConnectionValidity(connection, getNodes(), reactFlowEdges),
    [getNodes, reactFlowEdges],
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
      const allNodes = getNodes();

      if (!startNodeId || !handleType) {
        connectingNode.current = null;
        return;
      }

      const startNode = allNodes.find((n) => n.id === startNodeId);
      if (!startNode || !startNode.type) {
        connectingNode.current = null;
        return;
      }

      const findCompatibleNodes = () => {
        const candidates: { nodeType: string; nodeLabel: string; connectToHandle: string | null }[] = [];

        if (handleType === 'source') {
          for (const nodeDef of allNodeDefinitions) {
            const targetInputs = nodeDef.handles.inputs;
            const tempTargetNode: Node = {
              id: 'temp',
              type: nodeDef.type,
              position: { x: 0, y: 0 },
              data: structuredClone(nodeDef.initialData),
            };

            for (const targetHandle of targetInputs) {
              if (
                checkConnectionValidity(
                  { source: startNodeId, sourceHandle: startHandleId, target: 'temp', targetHandle: targetHandle.id },
                  [...allNodes, tempTargetNode],
                  reactFlowEdges,
                )
              ) {
                const label = targetHandle.id ? `${nodeDef.label} -> ${targetHandle.id}` : nodeDef.label;
                candidates.push({
                  nodeType: nodeDef.type,
                  nodeLabel: label,
                  connectToHandle: targetHandle.id,
                });
              }
            }
          }
        } else {
          for (const nodeDef of allNodeDefinitions) {
            const sourceOutputs = nodeDef.handles.outputs;
            const tempSourceNode: Node = {
              id: 'temp',
              type: nodeDef.type,
              position: { x: 0, y: 0 },
              data: structuredClone(nodeDef.initialData),
            };

            for (const sourceHandle of sourceOutputs) {
              if (
                checkConnectionValidity(
                  { source: 'temp', sourceHandle: sourceHandle.id, target: startNodeId, targetHandle: startHandleId },
                  [...allNodes, tempSourceNode],
                  reactFlowEdges,
                )
              ) {
                const label = sourceHandle.id ? `${sourceHandle.id} -> ${nodeDef.label}` : nodeDef.label;
                candidates.push({
                  nodeType: nodeDef.type,
                  nodeLabel: label,
                  connectToHandle: sourceHandle.id,
                });
              }
            }
          }
        }
        return Array.from(new Map(candidates.map((item) => [item.nodeLabel, item])).values());
      };

      const compatibleNodes = findCompatibleNodes();
      connectingNode.current = null;
      if (compatibleNodes.length === 0) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const createAndConnectNode = (nodeType: string, connectToHandle: string | null) => {
        const nodeDef = nodeDefinitionMap.get(nodeType);
        if (!nodeDef) return;

        const newNode = addNode({ type: nodeType, position, data: structuredClone(nodeDef.initialData) });
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
    [getNodes, reactFlowEdges, screenToFlowPosition, addNode, onConnect, setContextMenu],
  );

  const nodesWithDynamicClasses = useMemo(
    () =>
      nodes.map((node) => {
        const classNames = [];
        if (invalidNodeIds.has(node.id)) classNames.push('flow-node-invalid');
        if (node.id === activeNodeId) classNames.push('flow-node-executing');
        return {
          ...node,
          className: classNames.join(' '),
          zIndex: node.type === 'groupNode' ? -1 : 0,
        };
      }),
    [nodes, invalidNodeIds, activeNodeId],
  );

  return (
    <div className="flowchart-popup-ground" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodesWithDynamicClasses}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd as any}
        onPaneClick={() => setContextMenu(null)}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        isValidConnection={isValidConnection}
        minZoom={0.1}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      {contextMenu && (
        <div
          className="flowchart-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, zIndex: 999, position: 'fixed' }}
          onContextMenu={(e) => e.stopPropagation()}
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
  const { nodes, edges, loadFlow, getFlowData, addNode } = useFlow();
  const { getNodes } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyBuffer = useRef<Node[]>([]);

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

  // Copy/Paste effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          const selectedNodes = getNodes().filter((n) => n.selected);
          if (selectedNodes.length > 0) {
            copyBuffer.current = structuredClone(selectedNodes.map((n) => ({ ...n, selected: false })));
            st_echo('info', `${selectedNodes.length} node(s) copied.`);
          }
        } else if (event.key === 'v') {
          if (copyBuffer.current.length > 0) {
            copyBuffer.current.forEach((nodeToPaste) => {
              addNode({
                ...nodeToPaste,
                position: {
                  x: nodeToPaste.position.x + 20,
                  y: nodeToPaste.position.y + 20,
                },
              });
            });
            st_echo('info', `${copyBuffer.current.length} node(s) pasted.`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getNodes, addNode]);

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

  const handleRunFlow = () => {
    if (!isValid) {
      st_echo('error', 'Cannot run an invalid flow. Please fix the errors first.');
      return;
    }
    flowRunner.runManualTriggers(settings.activeFlow);
  };

  const handleCopyFlow = async () => {
    try {
      const flowData = getFlowData();
      const jsonString = JSON.stringify(flowData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      st_echo('info', `Flow "${settings.activeFlow}" copied to clipboard as JSON.`);
    } catch (err) {
      console.error('Failed to copy flow:', err);
      st_echo('error', 'Failed to copy flow to clipboard.');
    }
  };

  const handleScreenshot = useCallback(async () => {
    const flowElement = document.querySelector<HTMLElement>('.react-flow');
    const viewportElement = document.querySelector<HTMLElement>('.react-flow__viewport');

    if (!flowElement || !viewportElement) {
      st_echo('error', 'Could not find the flow element to screenshot.');
      return;
    }
    const nodes = getNodes();
    if (nodes.length === 0) {
      st_echo('info', 'Cannot take screenshot of an empty flow.');
      return;
    }

    const imageWidth = 2048;
    const padding = 40;
    const nodesBounds = getNodesBounds(nodes);

    const imageBounds = {
      width: nodesBounds.width + padding * 2,
      height: nodesBounds.height + padding * 2,
      x: nodesBounds.x - padding,
      y: nodesBounds.y - padding,
    };
    const imageHeight = (imageBounds.height / imageBounds.width) * imageWidth;

    const viewport = getViewportForBounds(imageBounds, imageWidth, imageHeight, 0.1, 2, {});

    const originalTransform = viewportElement.style.transform;
    viewportElement.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#202124',
        width: imageWidth,
        height: imageHeight,
        filter: (node: HTMLElement) => !node.classList?.contains('react-flow__controls'),
        skipFonts: true,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `flowchart-${settings.activeFlow}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      st_echo('info', 'Screenshot saved.');
    } catch (err) {
      console.error('Failed to take screenshot:', err);
      st_echo('error', 'Failed to take screenshot.');
    } finally {
      viewportElement.style.transform = originalTransform;
    }
  }, [getNodes, settings.activeFlow]);

  return (
    <div className="flowchart-ground-manager">
      <div className="flowchart-preset-selector" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
        <STButton color="primary" onClick={handleRunFlow}>
          Run Flow
        </STButton>
        <STButton onClick={handleCopyFlow}>Copy</STButton>
        <STButton onClick={handleScreenshot}>Screenshot</STButton>
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
