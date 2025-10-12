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
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { STButton, STInput, STPresetSelect, type PresetItem } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow, settingsManager } from '../../config.js';
import { toPng } from 'html-to-image';
import { allNodeDefinitions, nodeDefinitionMap, nodeTypes } from '../nodes/definitions/index.js';
import { useDebugStore } from './DebugPanel.js';
import { checkConnectionValidity } from '../../utils/connection-logic.js';

type CompatibilityInfo = {
  nodeType: string;
  nodeLabel: string;
  sourceHandle: string | null;
  targetHandle: string | null;
};

// Pre-computes which nodes can connect to which other nodes
function computeCompatibilityMap() {
  const sourceCompatibilityMap = new Map<string, Map<string | null, CompatibilityInfo[]>>();
  const targetCompatibilityMap = new Map<string, Map<string | null, CompatibilityInfo[]>>();

  const mockNodes: Node[] = allNodeDefinitions.map((def) => ({
    id: `temp-${def.type}`,
    type: def.type,
    position: { x: 0, y: 0 },
    data: structuredClone(def.initialData),
  }));

  // --- Source Compatibility (Dragging from an output) ---
  for (const sourceDef of allNodeDefinitions) {
    const sourceMap = new Map<string | null, CompatibilityInfo[]>();
    const sourceNode = mockNodes.find((n) => n.id === `temp-${sourceDef.type}`)!;
    const sourceHandles = [
      ...sourceDef.handles.outputs,
      ...(sourceDef.getDynamicHandles ? sourceDef.getDynamicHandles(sourceNode.data).outputs : []),
    ];

    for (const sourceHandle of sourceHandles) {
      const compatibleTargets: CompatibilityInfo[] = [];
      for (const targetDef of allNodeDefinitions) {
        const targetNode = mockNodes.find((n) => n.id === `temp-${targetDef.type}`)!;
        const targetHandles = [
          ...targetDef.handles.inputs,
          ...(targetDef.getDynamicHandles ? targetDef.getDynamicHandles(targetNode.data).inputs : []),
        ];

        for (const targetHandle of targetHandles) {
          if (
            checkConnectionValidity(
              {
                source: sourceNode.id,
                sourceHandle: sourceHandle.id,
                target: targetNode.id,
                targetHandle: targetHandle.id,
              },
              mockNodes,
              [],
            )
          ) {
            compatibleTargets.push({
              nodeType: targetDef.type,
              nodeLabel: targetHandle.id ? `${targetDef.label} (${targetHandle.id})` : targetDef.label,
              sourceHandle: sourceHandle.id, // Store the full context
              targetHandle: targetHandle.id, // Store the full context
            });
          }
        }
      }
      sourceMap.set(sourceHandle.id, compatibleTargets);
    }
    sourceCompatibilityMap.set(sourceDef.type, sourceMap);
  }

  // --- Target Compatibility (Dragging from an input) ---
  for (const targetDef of allNodeDefinitions) {
    const targetMap = new Map<string | null, CompatibilityInfo[]>();
    const targetNode = mockNodes.find((n) => n.id === `temp-${targetDef.type}`)!;
    const targetHandles = [
      ...targetDef.handles.inputs,
      ...(targetDef.getDynamicHandles ? targetDef.getDynamicHandles(targetNode.data).inputs : []),
    ];

    for (const targetHandle of targetHandles) {
      const compatibleSources: CompatibilityInfo[] = [];
      for (const sourceDef of allNodeDefinitions) {
        const sourceNode = mockNodes.find((n) => n.id === `temp-${sourceDef.type}`)!;
        const sourceHandles = [
          ...sourceDef.handles.outputs,
          ...(sourceDef.getDynamicHandles ? sourceDef.getDynamicHandles(sourceNode.data).outputs : []),
        ];

        for (const sourceHandle of sourceHandles) {
          if (
            checkConnectionValidity(
              {
                source: sourceNode.id,
                sourceHandle: sourceHandle.id,
                target: targetNode.id,
                targetHandle: targetHandle.id,
              },
              mockNodes,
              [],
            )
          ) {
            compatibleSources.push({
              nodeType: sourceDef.type,
              nodeLabel: sourceHandle.id ? `${sourceDef.label} (${sourceHandle.id})` : sourceDef.label,
              sourceHandle: sourceHandle.id,
              targetHandle: targetHandle.id,
            });
          }
        }
      }
      targetMap.set(targetHandle.id, compatibleSources);
    }
    targetCompatibilityMap.set(targetDef.type, targetMap);
  }

  return { sourceCompatibilityMap, targetCompatibilityMap };
}

const FlowCanvas: FC<{
  invalidNodeIds: Set<string>;
  compatibilityMap: ReturnType<typeof computeCompatibilityMap>;
}> = ({ invalidNodeIds, compatibilityMap }) => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect: baseOnConnect, addNode } = useFlowStore();
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const connectingNode = useRef<OnConnectStartParams | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    options: { label: string; action: () => void }[];
    searchTerm: string;
  } | null>(null);
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
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNode.current) return;
      if (wasConnectionSuccessful.current) {
        connectingNode.current = null;
        return;
      }

      event.stopPropagation();

      const { nodeId: startNodeId, handleId: startHandleId, handleType } = connectingNode.current;
      const startNode = getNodes().find((n) => n.id === startNodeId);
      if (!startNode || !startNode.type) {
        connectingNode.current = null;
        return;
      }

      const compatibleNodes =
        handleType === 'source'
          ? (compatibilityMap.sourceCompatibilityMap.get(startNode.type)?.get(startHandleId) ?? [])
          : (compatibilityMap.targetCompatibilityMap.get(startNode.type)?.get(startHandleId) ?? []);

      connectingNode.current = null;
      if (compatibleNodes.length === 0) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) {
        connectingNode.current = null;
        return;
      }
      const bounds = editorArea.getBoundingClientRect();

      // Correctly calculate position for the new NODE
      const position = screenToFlowPosition({ x: clientX, y: clientY });

      // Correctly calculate position for the new MENU
      const menuX = clientX - bounds.left;
      const menuY = clientY - bounds.top;

      const createAndConnectNode = (nodeType: string, sourceHandle: string | null, targetHandle: string | null) => {
        const nodeDef = nodeDefinitionMap.get(nodeType);
        if (!nodeDef) return;

        const nodeXOffset = handleType === 'source' ? 50 : -250; // Place left for input, right for output

        const newNode = addNode({
          type: nodeType,
          position: { x: position.x + nodeXOffset, y: position.y },
          data: structuredClone(nodeDef.initialData),
        });
        const connection =
          handleType === 'source'
            ? { source: startNodeId, sourceHandle: sourceHandle, target: newNode.id, targetHandle: targetHandle }
            : { source: newNode.id, sourceHandle: sourceHandle, target: startNodeId, targetHandle: targetHandle };

        // @ts-ignore
        setTimeout(() => onConnect(connection), 10);
      };

      if (compatibleNodes.length === 1) {
        const { nodeType, sourceHandle, targetHandle } = compatibleNodes[0];
        createAndConnectNode(nodeType, sourceHandle, targetHandle);
      } else {
        let finalMenuX = menuX;
        let finalMenuY = menuY;
        if (finalMenuX + 220 > bounds.width) finalMenuX -= 220;
        if (finalMenuY + 300 > bounds.height) finalMenuY = bounds.height - 310;

        setContextMenu({
          x: finalMenuX,
          y: finalMenuY,
          options: compatibleNodes.map(({ nodeType, nodeLabel, sourceHandle, targetHandle }) => ({
            label: nodeLabel,
            action: () => {
              createAndConnectNode(nodeType, sourceHandle, targetHandle);
              setContextMenu(null);
            },
          })),
          searchTerm: '',
        });
      }

      connectingNode.current = null;
    },
    [getNodes, edges, screenToFlowPosition, addNode, onConnect, setContextMenu, compatibilityMap],
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
          zIndex: node.type === 'groupNode' ? -1 : 1,
        };
      }),
    [nodes, invalidNodeIds, activeNodeId],
  );

  const filteredMenuOptions = useMemo(() => {
    if (!contextMenu) return [];
    if (!contextMenu.searchTerm) return contextMenu.options;
    const lowerSearch = contextMenu.searchTerm.toLowerCase();
    return contextMenu.options.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [contextMenu]);

  return (
    <div className="flowchart-popup-ground" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodesWithDynamicClasses}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
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
          <div className="context-menu-search-wrapper">
            <STInput
              type="text"
              placeholder="Search to add..."
              value={contextMenu.searchTerm}
              onChange={(e) =>
                setContextMenu((currentMenu) => (currentMenu ? { ...currentMenu, searchTerm: e.target.value } : null))
              }
              autoFocus
            />
          </div>
          <ul>
            {filteredMenuOptions.map((option, i) => (
              <li key={i} onClick={option.action} title={option.label}>
                {option.label}
              </li>
            ))}
            {filteredMenuOptions.length === 0 && <li className="no-results">No matching nodes</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

const FlowManager: FC = () => {
  const { nodes, edges, loadFlow, getSpecFlow, addNode, setNodes, setEdges } = useFlowStore();
  const { getNodes, setViewport, getViewport, screenToFlowPosition } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyBuffer = useRef<Node[]>([]);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const compatibilityMap = useMemo(() => computeCompatibilityMap(), []);

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
      const currentFlowData = getSpecFlow();
      settings.flows[settings.activeFlow] = structuredClone(currentFlowData);
      settingsManager.saveSettings();
      flowRunner.reinitialize();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, settings.activeFlow, getSpecFlow]);

  // Copy/Paste effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!document.querySelector('.flowchart-data-popup')?.contains(document.activeElement)) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          const selectedNodes = getNodes().filter((n) => n.selected);
          if (selectedNodes.length > 0) {
            const minX = Math.min(...selectedNodes.map((n) => n.position.x));
            const minY = Math.min(...selectedNodes.map((n) => n.position.y));
            copyBuffer.current = structuredClone(
              selectedNodes.map((n) => ({
                ...n,
                selected: true,
                position: { x: n.position.x - minX, y: n.position.y - minY },
              })),
            );
            st_echo('info', `${selectedNodes.length} node(s) copied.`);
          }
        } else if (event.key === 'v') {
          if (copyBuffer.current.length > 0) {
            const flowPos = screenToFlowPosition({
              x: mousePosRef.current.x + (flowWrapperRef.current?.getBoundingClientRect().left || 0),
              y: mousePosRef.current.y + (flowWrapperRef.current?.getBoundingClientRect().top || 0),
            });

            getNodes().forEach((n) => (n.selected = false));
            copyBuffer.current.forEach((nodeToPaste) => {
              addNode({
                ...nodeToPaste,
                position: { x: flowPos.x + nodeToPaste.position.x, y: flowPos.y + nodeToPaste.position.y },
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

  const { isValid, errors, invalidNodeIds } = useMemo(() => validateFlow(getSpecFlow()), [nodes, edges, getSpecFlow]);

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
    const newNodeIds = new Set(newNodes.map((n) => n.id));
    const newEdges = edges.filter((e) => newNodeIds.has(e.source) && newNodeIds.has(e.target));
    setNodes(newNodes);
    setEdges(newEdges);
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
      const flowData = getSpecFlow();
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
        <FlowCanvas invalidNodeIds={invalidNodeIds} compatibilityMap={compatibilityMap} />
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
