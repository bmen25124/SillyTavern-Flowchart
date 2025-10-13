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
import { STButton, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow, settingsManager } from '../../config.js';
import { toPng } from 'html-to-image';
import { useFlowRunStore } from './flowRunStore.js';
import { checkConnectionValidity } from '../../utils/connection-logic.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { registrator } from '../nodes/autogen-imports.js';
import { SpecFlow } from '../../flow-spec.js';

type CompatibilityInfo = {
  nodeType: string;
  nodeLabel: string;
  sourceHandle: string | null;
  targetHandle: string | null;
};

type ContextMenuState = {
  x: number;
  y: number;
  items: { label: string; action: () => void }[];
  searchTerm?: string;
  showSearch: boolean;
};

const FlowCanvas: FC<{
  invalidNodeIds: Set<string>;
}> = ({ invalidNodeIds }) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect: baseOnConnect,
    addNode,
    duplicateNode,
    toggleNodeDisabled,
  } = useFlowStore();
  const { screenToFlowPosition, getNodes, deleteElements } = useReactFlow();
  const connectingNode = useRef<OnConnectStartParams | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const debouncedSearchTerm = useDebounce(contextMenu?.searchTerm ?? '', 200);
  const wasConnectionSuccessful = useRef(false);
  const menuJustOpened = useRef(false);
  const { isVisualizationVisible, nodeReports, activeNodeId } = useFlowRunStore((state) => ({
    isVisualizationVisible: state.isVisualizationVisible,
    nodeReports: state.nodeReports,
    activeNodeId: state.activeNodeId,
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isPopupActive = !!document.querySelector('.flowchart-data-popup');
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (!isPopupActive || isInputFocused) return;

      if (event.code === 'Space') {
        event.preventDefault();
        const selectedNodes = getNodes().filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          toggleNodeDisabled(selectedNodes.map((n) => n.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getNodes, toggleNodeDisabled]);

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

  const onPaneClick = useCallback(() => {
    if (menuJustOpened.current) {
      menuJustOpened.current = false;
      return;
    }
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) return;
      const bounds = editorArea.getBoundingClientRect();
      menuJustOpened.current = true;
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        showSearch: false,
        items: [
          {
            label: 'Duplicate',
            action: () => {
              duplicateNode(node.id);
              setContextMenu(null);
            },
          },
          {
            label: 'Delete',
            action: () => {
              deleteElements({ nodes: [node] });
              setContextMenu(null);
            },
          },
          {
            label: node.data.disabled ? 'Enable' : 'Disable',
            action: () => {
              toggleNodeDisabled([node.id]);
              setContextMenu(null);
            },
          },
        ],
      });
    },
    [duplicateNode, deleteElements, setContextMenu, toggleNodeDisabled],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNode.current || wasConnectionSuccessful.current) {
        if (connectingNode.current) connectingNode.current = null;
        if (wasConnectionSuccessful.current) wasConnectionSuccessful.current = false; // Reset for next connection
        return;
      }

      event.stopPropagation();
      const { nodeId: startNodeId, handleId: startHandleId, handleType } = connectingNode.current;
      const allCurrentNodes = getNodes();
      const allCurrentEdges = edges;
      const startNode = allCurrentNodes.find((n) => n.id === startNodeId);

      if (!startNode || !startNode.type) {
        connectingNode.current = null;
        return;
      }

      const compatibleNodes: CompatibilityInfo[] = [];

      if (handleType === 'source') {
        for (const targetDef of registrator.allNodeDefinitions) {
          const tempTargetNode = {
            id: 'temp-target',
            type: targetDef.type,
            data: targetDef.initialData,
            position: { x: 0, y: 0 },
          } as Node;
          const targetHandles = [
            ...targetDef.handles.inputs,
            ...(targetDef.getDynamicHandles ? targetDef.getDynamicHandles(tempTargetNode, [], []).inputs : []),
          ];

          for (const targetHandle of targetHandles) {
            if (
              checkConnectionValidity(
                {
                  source: startNode.id,
                  sourceHandle: startHandleId,
                  target: tempTargetNode.id,
                  targetHandle: targetHandle.id,
                },
                [...allCurrentNodes, tempTargetNode],
                allCurrentEdges,
              )
            ) {
              compatibleNodes.push({
                nodeType: targetDef.type,
                nodeLabel: targetHandle.id ? `${targetDef.label} (${targetHandle.id})` : targetDef.label,
                sourceHandle: startHandleId,
                targetHandle: targetHandle.id,
              });
            }
          }
        }
      } else {
        for (const sourceDef of registrator.allNodeDefinitions) {
          const tempSourceNode = {
            id: 'temp-source',
            type: sourceDef.type,
            data: sourceDef.initialData,
            position: { x: 0, y: 0 },
          } as Node;
          const sourceHandles = [
            ...sourceDef.handles.outputs,
            ...(sourceDef.getDynamicHandles ? sourceDef.getDynamicHandles(tempSourceNode, [], []).outputs : []),
          ];

          for (const sourceHandle of sourceHandles) {
            if (
              checkConnectionValidity(
                {
                  source: tempSourceNode.id,
                  sourceHandle: sourceHandle.id,
                  target: startNode.id,
                  targetHandle: startHandleId,
                },
                [...allCurrentNodes, tempSourceNode],
                allCurrentEdges,
              )
            ) {
              compatibleNodes.push({
                nodeType: sourceDef.type,
                nodeLabel: sourceHandle.id ? `${sourceDef.label} (${sourceHandle.id})` : sourceDef.label,
                sourceHandle: sourceHandle.id,
                targetHandle: startHandleId,
              });
            }
          }
        }
      }

      if (compatibleNodes.length === 0) {
        connectingNode.current = null;
        return;
      }

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) {
        connectingNode.current = null;
        return;
      }
      const bounds = editorArea.getBoundingClientRect();
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      const menuX = clientX - bounds.left;
      const menuY = clientY - bounds.top;

      const createAndConnectNode = (nodeType: string, sourceHandle: string | null, targetHandle: string | null) => {
        const nodeDef = registrator.nodeDefinitionMap.get(nodeType);
        if (!nodeDef) return;
        const nodeXOffset = handleType === 'source' ? 50 : -250;
        const newNode = addNode({
          type: nodeType,
          position: { x: position.x + nodeXOffset, y: position.y },
          data: structuredClone(nodeDef.initialData),
        });
        const connection =
          handleType === 'source'
            ? { source: startNodeId, sourceHandle: sourceHandle, target: newNode.id, targetHandle: targetHandle }
            : { source: newNode.id, sourceHandle: sourceHandle, target: startNodeId, targetHandle: targetHandle };
        setTimeout(() => onConnect(connection as Connection), 10);
      };

      if (compatibleNodes.length === 1) {
        const { nodeType, sourceHandle, targetHandle } = compatibleNodes[0];
        createAndConnectNode(nodeType, sourceHandle, targetHandle);
      } else {
        let finalMenuX = menuX;
        let finalMenuY = menuY;
        if (finalMenuX + 220 > bounds.width) finalMenuX -= 220;
        if (finalMenuY + 300 > bounds.height) finalMenuY = bounds.height - 310;
        menuJustOpened.current = true;
        setContextMenu({
          x: finalMenuX,
          y: finalMenuY,
          items: compatibleNodes.map(({ nodeType, nodeLabel, sourceHandle, targetHandle }) => ({
            label: nodeLabel,
            action: () => {
              createAndConnectNode(nodeType, sourceHandle, targetHandle);
              setContextMenu(null);
            },
          })),
          searchTerm: '',
          showSearch: true,
        });
      }
      connectingNode.current = null;
    },
    [getNodes, edges, screenToFlowPosition, addNode, onConnect, setContextMenu],
  );

  const nodesWithDynamicClasses = useMemo(
    () =>
      nodes.map((node) => {
        const classNames = [];
        if (invalidNodeIds.has(node.id)) classNames.push('flow-node-invalid');

        if (node.id === activeNodeId) {
          classNames.push('flow-node-executing');
        } else if (isVisualizationVisible && nodeReports.has(node.id)) {
          const report = nodeReports.get(node.id);
          classNames.push(report?.status === 'error' ? 'flow-node-error' : 'flow-node-success');
        }

        return {
          ...node,
          className: classNames.join(' '),
          zIndex: node.type === 'groupNode' ? -1 : 1,
        };
      }),
    [nodes, invalidNodeIds, isVisualizationVisible, nodeReports, activeNodeId],
  );

  const filteredMenuOptions = useMemo(() => {
    if (!contextMenu) return [];
    if (!contextMenu.showSearch || !debouncedSearchTerm) return contextMenu.items;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return contextMenu.items.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [contextMenu, debouncedSearchTerm]);

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
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={registrator.nodeTypes}
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
          {contextMenu.showSearch && (
            <div className="context-menu-search-wrapper">
              <STInput
                type="text"
                placeholder="Search to add..."
                value={contextMenu.searchTerm ?? ''}
                onChange={(e) =>
                  setContextMenu((currentMenu) => (currentMenu ? { ...currentMenu, searchTerm: e.target.value } : null))
                }
                autoFocus
              />
            </div>
          )}
          <ul>
            {filteredMenuOptions.length > 0 ? (
              filteredMenuOptions.map((option, i) => (
                <li key={i} onClick={option.action} title={option.label}>
                  {option.label}
                </li>
              ))
            ) : contextMenu.showSearch ? (
              <li className="no-results">No matching nodes</li>
            ) : (
              <li className="no-results">No actions</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const FlowManager: FC = () => {
  const { nodes, edges, loadFlow, getSpecFlow, setNodes, setEdges, copySelection, paste } = useFlowStore();
  const { getNodes, setViewport, getViewport, screenToFlowPosition } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const { isVisualizationVisible, runId, runStatus, toggleVisualization, clearRun } = useFlowRunStore();

  useEffect(() => {
    let settingsChanged = false;
    for (const flowId in settings.flows) {
      if (settings.enabledFlows[flowId] === undefined) {
        settings.enabledFlows[flowId] = true;
        settingsChanged = true;
      }
    }
    if (!settings.flows[settings.activeFlow]) {
      settings.activeFlow = Object.keys(settings.flows)[0];
      settingsChanged = true;
    }
    if (settingsChanged) {
      settingsManager.saveSettings();
      forceUpdate();
    }
    const activeFlowData = settings.flows[settings.activeFlow]?.flow || { nodes: [], edges: [] };
    loadFlow(structuredClone(activeFlowData));
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const currentFlowData = getSpecFlow();
      if (settings.flows[settings.activeFlow]) {
        settings.flows[settings.activeFlow].flow = structuredClone(currentFlowData);
        settingsManager.saveSettings();
        flowRunner.reinitialize();
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges, settings.activeFlow, getSpecFlow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isPopupActive = !!document.querySelector('.flowchart-data-popup');
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

      if (!isPopupActive || isInputFocused) return;

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          event.preventDefault();
          copySelection();
          const selectedCount = getNodes().filter((n) => n.selected).length;
          if (selectedCount > 0) {
            st_echo('info', `${selectedCount} node(s) copied.`);
          }
        } else if (event.key === 'v') {
          event.preventDefault();
          const flowWrapperBounds = flowWrapperRef.current?.getBoundingClientRect();
          const reactFlowPane = document.querySelector('.react-flow__pane');

          if (flowWrapperBounds && reactFlowPane) {
            const paneBounds = reactFlowPane.getBoundingClientRect();
            const position = screenToFlowPosition({
              x: paneBounds.x + paneBounds.width / 2,
              y: paneBounds.y + paneBounds.height / 2,
            });
            paste(position);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, paste, getNodes, screenToFlowPosition]);

  const { isValid, errors, invalidNodeIds } = useMemo(() => validateFlow(getSpecFlow()), [nodes, edges, getSpecFlow]);

  const handleSelectChange = (flowId?: string) => {
    if (flowId && settings.flows[flowId]) {
      settings.activeFlow = flowId;
      loadFlow(structuredClone(settings.flows[flowId].flow));
      forceUpdate();
    }
  };

  const { Popup } = SillyTavern.getContext();

  const handleAddFlow = async () => {
    const newName = await Popup.show.input('New Flow Name', 'Enter a unique name for the new flow.');
    if (!newName) return;
    if (Object.values(settings.flows).some((f) => f.name === newName)) {
      st_echo('error', `A flow named "${newName}" already exists.`);
      return;
    }
    const flowId = crypto.randomUUID();
    settings.flows[flowId] = { name: newName, flow: createDefaultFlow() };
    settings.enabledFlows[flowId] = true;
    settings.activeFlow = flowId;
    loadFlow(structuredClone(settings.flows[flowId].flow));
    forceUpdate();
  };

  const handleRenameFlow = async () => {
    const currentName = settings.flows[settings.activeFlow].name;
    const newName = await Popup.show.input('Rename Flow', `Enter a new name for "${currentName}".`, currentName);
    if (!newName || newName === currentName) return;
    if (Object.values(settings.flows).some((f) => f.name === newName)) {
      st_echo('error', `A flow named "${newName}" already exists.`);
      return;
    }
    settings.flows[settings.activeFlow].name = newName;
    forceUpdate();
  };

  const handleDeleteFlow = async () => {
    if (Object.keys(settings.flows).length <= 1) {
      st_echo('error', 'Cannot delete the last flow.');
      return;
    }
    const currentName = settings.flows[settings.activeFlow].name;
    const confirmation = await Popup.show.confirm('Delete Flow', `Are you sure you want to delete "${currentName}"?`);
    if (confirmation) {
      delete settings.flows[settings.activeFlow];
      delete settings.enabledFlows[settings.activeFlow];
      settings.activeFlow = Object.keys(settings.flows)[0];
      loadFlow(structuredClone(settings.flows[settings.activeFlow].flow));
      forceUpdate();
    }
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
    clearRun();
    flowRunner.runFlowManually(settings.activeFlow);
  };

  const handleCopyFlow = async () => {
    try {
      const flowData = getSpecFlow();
      const jsonString = JSON.stringify(flowData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      st_echo('info', `Flow "${settings.flows[settings.activeFlow].name}" copied to clipboard as JSON.`);
    } catch (err) {
      console.error('Failed to copy flow:', err);
      st_echo('error', 'Failed to copy flow to clipboard.');
    }
  };

  const handlePasteFlow = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        st_echo('error', 'Clipboard is empty.');
        return;
      }

      const parsedData = JSON.parse(clipboardText);

      // Basic validation
      if (!parsedData || !Array.isArray(parsedData.nodes) || !Array.isArray(parsedData.edges)) {
        throw new Error('Parsed JSON is not a valid flow structure.');
      }

      loadFlow(parsedData as SpecFlow);
      st_echo('info', 'Flow pasted from clipboard, replacing current flow.');
    } catch (error) {
      console.error('Failed to paste flow:', error);
      st_echo('error', 'Failed to paste from clipboard. Make sure it contains valid flow JSON.');
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
        link.download = `flowchart-${settings.flows[settings.activeFlow].name}.png`;
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
  }, [getNodes, setViewport, getViewport, settings.activeFlow, settings.flows]);

  return (
    <div className="flowchart-ground-manager">
      <div className="flowchart-preset-selector" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label>Active Flow:</label>
        <STSelect value={settings.activeFlow} onChange={(e) => handleSelectChange(e.target.value)} style={{ flex: 1 }}>
          {Object.entries(settings.flows).map(([id, { name }]) => (
            <option key={id} value={id}>
              {name} {settings.enabledFlows[id] === false ? '(Disabled)' : ''}
            </option>
          ))}
        </STSelect>
        <STButton onClick={handleAddFlow}>+ New</STButton>
        <STButton onClick={handleRenameFlow}>Rename</STButton>
        <STButton onClick={handleDeleteFlow} color="danger">
          Delete
        </STButton>
        <div style={{ flex: 1 }}></div>
        {runId && (
          <>
            <STButton onClick={toggleVisualization}>
              {isVisualizationVisible ? 'Hide Last Run' : 'Show Last Run'}
            </STButton>
            <STButton color="secondary" onClick={clearRun}>
              Clear Run
            </STButton>
          </>
        )}
        {!isValid && (
          <STButton color="danger" onClick={handleClearInvalid} title={errors.join('\n')}>
            Fix Errors ({errors.length})
          </STButton>
        )}
        {runStatus === 'running' ? (
          <STButton color="danger" onClick={() => flowRunner.abortCurrentRun()}>
            <i className="fa-solid fa-stop"></i> Stop
          </STButton>
        ) : (
          <STButton
            color="primary"
            onClick={handleRunFlow}
            title="Run the flow starting from Manual Triggers, or from the beginning if none exist."
          >
            <i className="fa-solid fa-play"></i> Run
          </STButton>
        )}
        <STButton onClick={handleCopyFlow} title="Copy Flow JSON">
          <i className="fa-solid fa-copy"></i>
        </STButton>
        <STButton onClick={handlePasteFlow} title="Paste Flow from Clipboard">
          <i className="fa-solid fa-paste"></i>
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
