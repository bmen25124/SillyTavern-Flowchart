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
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import { useFlowStore } from './flowStore.js';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { STButton, STPresetSelect, type PresetItem } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow } from '../../config.js';
import { toPng } from 'html-to-image';
import { allNodeDefinitions, nodeDefinitionMap, nodeTypes } from '../nodes/definitions/index.js';
import { useDebugStore } from './DebugPanel.js';
import { checkConnectionValidity } from '../../utils/connection-logic.js';

type AddNodeContextMenu = {
  x: number;
  y: number;
  options: {
    label: string;
    action: () => void;
  }[];
};

const FlowCanvas: FC<{ invalidNodeIds: Set<string> }> = ({ invalidNodeIds }) => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect: baseOnConnect, addNode } = useFlowStore();
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const connectingNode = useRef<OnConnectStartParams | null>(null);
  const [contextMenu, setContextMenu] = useState<AddNodeContextMenu | null>(null);
  const wasConnectionSuccessful = useRef(false);
  const activeNodeId = useDebugStore((state) => state.activeNodeId);

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => checkConnectionValidity(connection, getNodes(), edges),
    [getNodes, edges],
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

        const getHandlesForNodeDef = (nodeDef: (typeof allNodeDefinitions)[0]) => {
          const staticHandles = { ...nodeDef.handles };
          const dynamicHandles = nodeDef.getDynamicHandles
            ? nodeDef.getDynamicHandles(structuredClone(nodeDef.initialData))
            : { inputs: [], outputs: [] };
          return {
            inputs: [...staticHandles.inputs, ...dynamicHandles.inputs],
            outputs: [...staticHandles.outputs, ...dynamicHandles.outputs],
          };
        };

        if (handleType === 'source') {
          for (const nodeDef of allNodeDefinitions) {
            const { inputs: targetInputs } = getHandlesForNodeDef(nodeDef);
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
                  edges,
                )
              ) {
                const label = targetHandle.id ? `${nodeDef.label} (to ${targetHandle.id})` : nodeDef.label;
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
            const { outputs: sourceOutputs } = getHandlesForNodeDef(nodeDef);
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
                  edges,
                )
              ) {
                const label = sourceHandle.id ? `${nodeDef.label} (from ${sourceHandle.id})` : nodeDef.label;
                candidates.push({
                  nodeType: nodeDef.type,
                  nodeLabel: label,
                  connectToHandle: sourceHandle.id,
                });
              }
            }
          }
        }

        // Group by category for context menu
        candidates.sort((a, b) => {
          const catA = nodeDefinitionMap.get(a.nodeType)?.category || '';
          const catB = nodeDefinitionMap.get(b.nodeType)?.category || '';
          return catA.localeCompare(catB) || a.nodeLabel.localeCompare(b.nodeLabel);
        });

        return candidates;
      };

      const compatibleNodes = findCompatibleNodes();
      connectingNode.current = null;
      if (compatibleNodes.length === 0) return;

      // Calculate position for new node
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      let position = { x: 0, y: 0 };
      if (reactFlowBounds) {
        position = screenToFlowPosition({
          x: event.clientX > reactFlowBounds.right - 200 ? event.clientX - 200 : event.clientX,
          y: event.clientY,
        });
      }

      const createAndConnectNode = (nodeType: string, connectToHandle: string | null) => {
        const nodeDef = nodeDefinitionMap.get(nodeType);
        if (!nodeDef) return;

        // Offset new node slightly
        const newNode = addNode({
          type: nodeType,
          position: { x: position.x + 50, y: position.y },
          data: structuredClone(nodeDef.initialData),
        });
        const connection =
          handleType === 'source'
            ? { source: startNodeId, sourceHandle: startHandleId, target: newNode.id, targetHandle: connectToHandle }
            : { source: newNode.id, sourceHandle: connectToHandle, target: startNodeId, targetHandle: startHandleId };

        // Small delay to allow node to render before connecting
        setTimeout(() => onConnect(connection), 10);
      };

      if (compatibleNodes.length === 1) {
        createAndConnectNode(compatibleNodes[0].nodeType, compatibleNodes[0].connectToHandle);
      } else {
        // Calculate menu position, keeping it within viewport bounds
        let menuX = event.clientX;
        let menuY = event.clientY;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (menuX + 220 > windowWidth) menuX = windowWidth - 230;
        if (menuY + 300 > windowHeight) menuY = windowHeight - 310;

        setContextMenu({
          x: menuX,
          y: menuY,
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
    [getNodes, edges, screenToFlowPosition, addNode, onConnect, setContextMenu],
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
          zIndex: node.type === 'groupNode' ? -1 : 1, // Ensure nodes are above groups
        };
      }),
    [nodes, invalidNodeIds, activeNodeId],
  );

  return (
    <div className="flowchart-popup-ground" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodesWithDynamicClasses}
        edges={edges}
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
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#444" gap={15} variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
      {contextMenu && (
        <div
          className="flowchart-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ul>
            {contextMenu.options.map((option, i) => (
              <li key={i} onClick={option.action} title={option.label}>
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
  const { nodes, edges, loadFlow, getFlowData, addNode } = useFlowStore();
  const { getNodes, setViewport, getViewport, screenToFlowPosition } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyBuffer = useRef<Node[]>([]);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  // Track mouse position relative to the flow wrapper for accurate pasting
  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (flowWrapperRef.current) {
        const bounds = flowWrapperRef.current.getBoundingClientRect();
        mousePosRef.current = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      }
    };
    // Attach to wrapper to get coordinates relative to it
    const wrapper = flowWrapperRef.current;
    wrapper?.addEventListener('mousemove', onMouseMove);
    return () => wrapper?.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Load active flow into store on mount
  useEffect(() => {
    const activeFlowData = settings.flows[settings.activeFlow] || { nodes: [], edges: [] };
    loadFlow(structuredClone(activeFlowData));
  }, []); // Run only once on mount

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
      // Ensure we are focused inside the popup
      if (!document.querySelector('.flowchart-data-popup')?.contains(document.activeElement)) return;

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          const selectedNodes = getNodes().filter((n) => n.selected);
          if (selectedNodes.length > 0) {
            // Find top-left most node to use as anchor
            const minX = Math.min(...selectedNodes.map((n) => n.position.x));
            const minY = Math.min(...selectedNodes.map((n) => n.position.y));

            copyBuffer.current = structuredClone(
              selectedNodes.map((n) => ({
                ...n,
                selected: true, // Keep selected upon paste
                position: {
                  x: n.position.x - minX,
                  y: n.position.y - minY,
                },
              })),
            );
            st_echo('info', `${selectedNodes.length} node(s) copied.`);
          }
        } else if (event.key === 'v') {
          if (copyBuffer.current.length > 0) {
            // Convert mouse screen coordinates to flow coordinates
            const flowPos = screenToFlowPosition({
              x: mousePosRef.current.x + (flowWrapperRef.current?.getBoundingClientRect().left || 0),
              y: mousePosRef.current.y + (flowWrapperRef.current?.getBoundingClientRect().top || 0),
            });

            // Deselect current nodes
            getNodes().forEach((n) => (n.selected = false));

            copyBuffer.current.forEach((nodeToPaste) => {
              addNode({
                ...nodeToPaste,
                position: {
                  x: flowPos.x + nodeToPaste.position.x,
                  y: flowPos.y + nodeToPaste.position.y,
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
  }, [getNodes, addNode, screenToFlowPosition]);

  const { isValid, errors, invalidNodeIds } = useMemo(() => validateFlow({ nodes, edges }), [nodes, edges]);

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
    // Only remove nodes, ReactFlow handles edge removal automatically
    const newNodes = nodes.filter((node) => !invalidNodeIds.has(node.id));
    loadFlow({
      nodes: newNodes,
      edges: edges.filter((e) => newNodes.some((n) => n.id === e.source) && newNodes.some((n) => n.id === e.target)),
    });
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
    if (!flowElement) {
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

    const originalViewport = getViewport();
    setViewport(viewport, { duration: 0 });

    // Allow React Flow to re-render with the new viewport before taking the screenshot.
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(flowElement, {
          backgroundColor: '#202124',
          width: imageWidth,
          height: imageHeight,
          filter: (node: HTMLElement) =>
            !node.classList?.contains('react-flow__controls') && !node.classList?.contains('react-flow__minimap'),
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
        // Restore the original viewport.
        setViewport(originalViewport, { duration: 0 });
      }
    }, 100);
  }, [getNodes, setViewport, getViewport, settings.activeFlow]);

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
        <div style={{ flex: 1 }}></div>
        {!isValid && (
          <STButton color="danger" onClick={handleClearInvalid} title={errors.join('\n')}>
            Fix Errors ({errors.length})
          </STButton>
        )}
        <STButton color="primary" onClick={handleRunFlow} title="Run Manual Triggers">
          <i className="fa-solid fa-play"></i> Run
        </STButton>
        <STButton onClick={handleCopyFlow} title="Copy Flow JSON">
          <i className="fa-solid fa-copy"></i>
        </STButton>
        <STButton onClick={handleScreenshot} title="Take Screenshot">
          <i className="fa-solid fa-camera"></i>
        </STButton>
      </div>

      <div className="flowchart-editor-area" ref={flowWrapperRef}>
        <NodePalette />
        <FlowCanvas invalidNodeIds={invalidNodeIds} />
      </div>
    </div>
  );
};

export const FlowChartGround: FC = () => {
  return (
    <ReactFlowProvider>
      <FlowManager />
    </ReactFlowProvider>
  );
};
