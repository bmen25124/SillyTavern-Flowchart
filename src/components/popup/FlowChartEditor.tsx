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
  OnNodeDrag,
} from '@xyflow/react';
import { useFlowStore } from './flowStore.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { notify } from '../../utils/notify.js';
import { STButton, STInput, STPresetSelect, PresetItem, PresetButtonDef } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';
import { validateFlow } from '../../validator.js';
import { createDefaultFlow, settingsManager, FlowData } from '../../config.js';
import { toPng } from 'html-to-image';
import { useFlowRunStore } from './flowRunStore.js';
import { checkConnectionValidity } from '../../utils/connection-logic.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { registrator } from '../nodes/autogen-imports.js';
import { SpecFlow } from '../../flow-spec.js';
import { getHandleSpec } from '../../utils/handle-logic.js';
import { FlowDataType, FlowDataTypeColors } from '../../flow-types.js';
import { ValidationIssue } from '../nodes/definitions/types.js';
import { CURRENT_FLOW_VERSION } from '../../flow-migrations.js';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

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
  errorsByNodeId: Map<string, ValidationIssue[]>;
}> = ({ invalidNodeIds, errorsByNodeId }) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect: baseOnConnect,
    addNode,
    duplicateNode,
    toggleNodeDisabled,
    copySelection,
    setNodes,
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
  const { pause, resume } = useFlowStore.temporal.getState();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isPopupActive = !!document.querySelector('.flowchart-data-popup');
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        !!document.activeElement?.closest('.cm-content');

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
      resume();
      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) return;
      const bounds = editorArea.getBoundingClientRect();
      const { activeFlow } = settingsManager.getSettings();

      menuJustOpened.current = true;
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        showSearch: false,
        items: [
          {
            label: 'Copy',
            action: () => {
              setNodes(getNodes().map((n) => ({ ...n, selected: n.id === node.id })));
              setTimeout(() => {
                copySelection();
                notify('info', `Node '${(node.data as any).label || node.type}' copied.`, 'ui_action');
              }, 50);
              setContextMenu(null);
            },
          },
          {
            label: 'Duplicate',
            action: () => {
              duplicateNode(node.id);
              setContextMenu(null);
            },
          },
          {
            label: 'Run From Here',
            action: () => {
              flowRunner.runFlowFromNode(activeFlow, node.id);
              setContextMenu(null);
            },
          },
          {
            label: 'Run To Here',
            action: () => {
              flowRunner.runFlowToNode(activeFlow, node.id);
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
    [duplicateNode, deleteElements, setContextMenu, toggleNodeDisabled, copySelection, setNodes, getNodes, resume],
  );

  const openNodeCreationMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      resume();

      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) return;

      const bounds = editorArea.getBoundingClientRect();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const createNode = (nodeType: string, data: any) => {
        addNode({
          type: nodeType,
          position: { x: position.x - 75, y: position.y - 25 },
          data,
        });
      };

      menuJustOpened.current = true;
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        items: registrator.allNodeDefinitions.map((def) => ({
          label: def.label,
          action: () => {
            createNode(def.type, structuredClone(def.initialData));
            setContextMenu(null);
          },
        })),
        searchTerm: '',
        showSearch: true,
      });
    },
    [screenToFlowPosition, addNode, setContextMenu, resume],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNode.current || wasConnectionSuccessful.current) {
        if (connectingNode.current) connectingNode.current = null;
        if (wasConnectionSuccessful.current) wasConnectionSuccessful.current = false;
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

      resume();

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
            ? { source: startNodeId, sourceHandle, target: newNode.id, targetHandle }
            : { source: newNode.id, sourceHandle, target: startNodeId, targetHandle };
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
    [getNodes, edges, screenToFlowPosition, addNode, onConnect, setContextMenu, resume],
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

        const nodeErrors = errorsByNodeId.get(node.id);

        return {
          ...node,
          data: {
            ...node.data,
            _validationErrors: nodeErrors,
          },
          className: classNames.join(' '),
        };
      }),
    [nodes, invalidNodeIds, isVisualizationVisible, nodeReports, activeNodeId, errorsByNodeId],
  );

  const filteredMenuOptions = useMemo(() => {
    if (!contextMenu) return [];
    if (!contextMenu.showSearch || !debouncedSearchTerm) return contextMenu.items;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return contextMenu.items.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [contextMenu, debouncedSearchTerm]);

  const styledEdges = useMemo(() => {
    const allNodes = getNodes();
    return edges.map((edge) => {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) return edge;

      const handleSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, edges);
      const color = FlowDataTypeColors[handleSpec?.type ?? FlowDataType.ANY];

      return { ...edge, style: { stroke: color, strokeWidth: 2 } };
    });
  }, [nodes, edges, getNodes]);

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    pause();
  }, [pause]);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    resume();
  }, [resume]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow/node-type');
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const nodeDef = registrator.nodeDefinitionMap.get(nodeType);

      if (!nodeDef) return;

      addNode({
        type: nodeType,
        position,
        data: structuredClone(nodeDef.initialData || {}),
      });
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div className="flowchart-editor-canvas" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodesWithDynamicClasses}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={openNodeCreationMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={registrator.nodeTypesWithFallback}
        colorMode="dark"
        fitView
        isValidConnection={isValidConnection}
        minZoom={0.1}
        deleteKeyCode={['Delete', 'Backspace']}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#444" gap={15} variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap />
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
  const { nodes, edges, loadFlow, getSpecFlow, copySelection, paste } = useFlowStore();
  const { undo, redo } = useFlowStore.temporal.getState();
  const { getNodes, setViewport, screenToFlowPosition, fitView, getViewport } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const { isVisualizationVisible, runId, runStatus, toggleVisualization, clearRun } = useFlowRunStore();
  const activeFlowData = settings.flows.find((f) => f.id === settings.activeFlow);

  useEffect(() => {
    if (!settings.flows.find((f) => f.id === settings.activeFlow)) {
      settings.activeFlow = settings.flows[0]?.id || '';
      settingsManager.saveSettings();
      forceUpdate();
    }
    const activeFlowEntry = settings.flows.find((f) => f.id === settings.activeFlow);
    const activeFlowData = activeFlowEntry?.flow || { nodes: [], edges: [] };
    const activeFlowVersion = activeFlowEntry?.flowVersion;
    loadFlow(structuredClone(activeFlowData), activeFlowVersion);
    useFlowStore.temporal.getState().clear();
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
      if (activeFlow) {
        activeFlow.flow = getSpecFlow();
        activeFlow.flowVersion = CURRENT_FLOW_VERSION;
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
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        !!document.activeElement?.closest('.cm-content');

      if (!isPopupActive || isInputFocused) return;

      const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z';
      const isRedo = (event.ctrlKey || event.metaKey) && event.key === 'y';

      if (isUndo) {
        event.preventDefault();
        undo();
      } else if (isRedo) {
        event.preventDefault();
        redo();
      } else if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          event.preventDefault();
          copySelection();
          const selectedCount = getNodes().filter((n) => n.selected).length;
          if (selectedCount > 0) {
            notify('info', `${selectedCount} node(s) copied.`, 'ui_action');
          }
        } else if (event.key === 'v') {
          event.preventDefault();
          const reactFlowPane = document.querySelector('.react-flow__pane');
          if (reactFlowPane) {
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
  }, [copySelection, paste, getNodes, screenToFlowPosition, undo, redo, fitView]);

  const { isValid, errors, invalidNodeIds, errorsByNodeId } = useMemo(
    () => validateFlow(getSpecFlow(), activeFlowData?.allowDangerousExecution ?? false),
    [nodes, edges, getSpecFlow, activeFlowData?.allowDangerousExecution],
  );

  const flowItems = useMemo(
    () => settings.flows.map((flow) => ({ value: flow.id, label: flow.name })),
    [settings.flows],
  );

  const handleSelectChange = useCallback(
    (flowId?: string) => {
      if (flowId && settings.flows.some((f) => f.id === flowId)) {
        settings.activeFlow = flowId;
        const flowData = settings.flows.find((f) => f.id === flowId)!.flow;
        loadFlow(structuredClone(flowData));
        useFlowStore.temporal.getState().clear();
        forceUpdate();
      }
    },
    [settings, loadFlow, forceUpdate],
  );

  const handleCreateFlow = useCallback(
    (newName: string) => {
      const sanitizedName = slugify(newName);
      if (!sanitizedName) {
        notify('error', 'Flow name cannot be empty.', 'ui_action');
        return { confirmed: false };
      }
      if (settings.flows.some((f) => f.name === sanitizedName)) {
        notify('error', `A flow with the name "${sanitizedName}" already exists.`, 'ui_action');
        return { confirmed: false };
      }
      return { confirmed: true, value: { value: crypto.randomUUID(), label: sanitizedName } };
    },
    [settings.flows],
  );

  const handleRenameFlow = useCallback(
    (flowId: string, newName: string) => {
      const sanitizedName = slugify(newName);
      if (!sanitizedName) {
        notify('error', 'Flow name cannot be empty.', 'ui_action');
        return { confirmed: false };
      }
      if (settings.flows.some((f) => f.name === sanitizedName && f.id !== flowId)) {
        notify('error', `A flow with the name "${sanitizedName}" already exists.`, 'ui_action');
        return { confirmed: false };
      }
      return { confirmed: true, value: { value: flowId, label: sanitizedName } };
    },
    [settings.flows],
  );

  const handleDeleteFlow = useCallback(
    (flowId: string) => {
      if (settings.flows.length <= 1) {
        notify('error', 'Cannot delete the last flow.', 'ui_action');
        return false;
      }
      return true;
    },
    [settings.flows],
  );

  const handleItemsChange = useCallback(
    (newItems: PresetItem[]) => {
      const oldFlows = settings.flows;
      const newFlows: FlowData[] = [];

      for (const item of newItems) {
        const id = item.value;
        const name = slugify(item.label);
        const existingFlow = oldFlows.find((f) => f.id === id);

        if (existingFlow) {
          newFlows.push({ ...existingFlow, name });
        } else {
          newFlows.push({
            id,
            name,
            flow: createDefaultFlow(),
            flowVersion: CURRENT_FLOW_VERSION,
            allowDangerousExecution: false,
            enabled: true,
          });
        }
      }

      settings.flows = newFlows;

      if (!settings.flows.some((f) => f.id === settings.activeFlow)) {
        settings.activeFlow = newItems.length > 0 ? newItems[0].value : '';
      }

      settingsManager.saveSettings();
      flowRunner.reinitialize();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const handleRunFlow = useCallback(() => {
    if (!isValid) {
      notify('error', 'Cannot run an invalid flow. Please fix the errors first.', 'ui_action');
      return;
    }
    clearRun();
    flowRunner.runFlowManually(settings.activeFlow);
  }, [isValid, settings.activeFlow, clearRun]);

  const handleCopyToClipboard = useCallback(async () => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;
    try {
      // Copy just the flow structure, not the full FlowData object
      const flowStructure = getSpecFlow();
      const jsonString = JSON.stringify(flowStructure, null, 2);
      await navigator.clipboard.writeText(jsonString);
      notify('info', `Flow "${activeFlow.name}" copied to clipboard as JSON.`, 'ui_action');
    } catch (err) {
      console.error('Failed to copy flow:', err);
      notify('error', 'Failed to copy flow to clipboard.', 'ui_action');
    }
  }, [getSpecFlow, settings.activeFlow, settings.flows]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        notify('error', 'Clipboard is empty.', 'ui_action');
        return;
      }
      const importedFlow = JSON.parse(clipboardText) as SpecFlow;

      if (!importedFlow || !Array.isArray(importedFlow.nodes) || !Array.isArray(importedFlow.edges)) {
        throw new Error('Parsed JSON is not a valid flow structure.');
      }

      // Check if this looks like an exported FlowData object (has version info)
      let importedFlowVersion: string | undefined = undefined;

      if (importedFlow && typeof importedFlow === 'object' && 'flowVersion' in importedFlow) {
        // This is likely a full FlowData export
        const flowData = importedFlow as any;
        importedFlowVersion = flowData.flowVersion;
      }

      // For pasted flows, we assume they might be from an older version
      const needsMigration = !importedFlowVersion; // If no version, assume needs migration

      if (needsMigration) {
        const { Popup } = SillyTavern.getContext();
        const confirmation = await Popup.show.confirm(
          'Flow Paste',
          `The pasted flow may need to be migrated to work correctly. Do you want to proceed?`,
        );

        if (!confirmation) {
          return;
        }
      }

      loadFlow(importedFlow, importedFlowVersion);
      useFlowStore.temporal.getState().clear();
      const migrationMessage = needsMigration ? ' (may require migration)' : '';
      notify('info', `Flow pasted from clipboard${migrationMessage}, replacing current flow.`, 'ui_action');
    } catch (error) {
      console.error('Failed to paste flow:', error);
      notify('error', 'Failed to paste from clipboard. Make sure it contains valid flow JSON.', 'ui_action');
    }
  }, [loadFlow]);

  const handleExportToFile = useCallback(() => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;

    try {
      const jsonString = JSON.stringify(getSpecFlow(), null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flow-${activeFlow.name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('info', `Flow "${activeFlow.name}" exported.`, 'ui_action');
    } catch (err) {
      console.error('Failed to export flow:', err);
      notify('error', 'Failed to export flow.', 'ui_action');
    }
  }, [getSpecFlow, settings.activeFlow, settings.flows]);

  const handleImportFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          let importedFlow = JSON.parse(text) as SpecFlow;

          if (!importedFlow || !Array.isArray(importedFlow.nodes) || !Array.isArray(importedFlow.edges)) {
            throw new Error('Invalid flow file structure.');
          }

          const currentSettings = settingsManager.getSettings();
          let newName = slugify(file.name.replace(/\.json$/, ''));
          if (!newName) {
            newName = 'imported-flow';
          }

          const existingNames = new Set(currentSettings.flows.map((f) => f.name));
          if (existingNames.has(newName)) {
            let i = 1;
            while (existingNames.has(`${newName}-${i}`)) {
              i++;
            }
            newName = `${newName}-${i}`;
          }

          // For imported flows, we assume they might be from an older version
          // and need migration
          let importedFlowVersion: string | undefined = undefined;

          // Check if this looks like an exported FlowData object (has version info)
          if (importedFlow && typeof importedFlow === 'object' && 'flowVersion' in importedFlow) {
            // This is likely a full FlowData export
            const flowData = importedFlow as any;
            importedFlow = flowData.flow || importedFlow;
            importedFlowVersion = flowData.flowVersion;
          }

          const needsMigration = !importedFlowVersion; // If no version, assume needs migration

          if (needsMigration) {
            const { Popup } = SillyTavern.getContext();
            const confirmation = await Popup.show.confirm(
              'Flow Import',
              `The imported flow may need to be migrated to work correctly with your current version. Do you want to proceed with import and migration?`,
            );

            if (!confirmation) {
              return;
            }
          }

          const newFlow: FlowData = {
            id: crypto.randomUUID(),
            name: newName,
            flow: importedFlow,
            flowVersion: importedFlowVersion || CURRENT_FLOW_VERSION,
            allowDangerousExecution: false, // Security: never trust imported flows by default
            enabled: true,
          };

          currentSettings.flows = [...currentSettings.flows, newFlow];
          currentSettings.activeFlow = newFlow.id;

          settingsManager.saveSettings();
          loadFlow(importedFlow, importedFlowVersion);
          useFlowStore.temporal.getState().clear();
          forceUpdate();

          const migrationMessage = needsMigration ? ' (may require migration)' : '';
          notify('info', `Flow "${newName}" imported${migrationMessage} successfully.`, 'ui_action');
        } catch (err: any) {
          console.error('Failed to import flow:', err);
          notify('error', `Failed to import flow: ${err.message}`, 'ui_action');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadFlow, forceUpdate]);

  const handleScreenshot = useCallback(async () => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;
    const flowElement = document.querySelector<HTMLElement>('.react-flow');
    if (!flowElement) {
      notify('error', 'Could not find the flow element to screenshot.', 'ui_action');
      return;
    }
    const nodes = getNodes();
    if (nodes.length === 0) {
      notify('warning', 'Cannot take screenshot of an empty flow.', 'ui_action');
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
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    const previousBg = pane.style.backgroundColor;
    pane.style.backgroundColor = '#202124';

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
        link.download = `flowchart-${activeFlow.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dataUrl);
        notify('info', 'Screenshot saved.', 'ui_action');
      } catch (err) {
        console.error('Failed to take screenshot:', err);
        notify('error', 'Failed to take screenshot.', 'ui_action');
      } finally {
        setViewport(originalViewport, { duration: 0 });
        pane.style.backgroundColor = previousBg;
      }
    }, 100);
  }, [getNodes, setViewport, getViewport, settings.activeFlow, settings.flows]);

  const presetButtons = useMemo(
    (): PresetButtonDef[] => [
      {
        key: 'copy-clipboard',
        icon: 'fa-solid fa-copy',
        title: 'Copy Flow JSON to Clipboard (Ctrl+C)',
        onClick: handleCopyToClipboard,
      },
      {
        key: 'paste-clipboard',
        icon: 'fa-solid fa-paste',
        title: 'Paste Flow from Clipboard (Ctrl+V)',
        onClick: handlePasteFromClipboard,
      },
      {
        key: 'export-file',
        icon: 'fa-solid fa-file-export',
        title: 'Export Flow to File',
        onClick: handleExportToFile,
      },
      {
        key: 'import-file',
        icon: 'fa-solid fa-file-import',
        title: 'Import Flow from File',
        onClick: handleImportFromFile,
      },
      {
        key: 'screenshot',
        icon: 'fa-solid fa-camera',
        title: 'Take Screenshot',
        onClick: handleScreenshot,
      },
    ],
    [handleCopyToClipboard, handlePasteFromClipboard, handleExportToFile, handleImportFromFile, handleScreenshot],
  );

  const handleToggleFlow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const activeFlowData = settings.flows.find((f) => f.id === settings.activeFlow);
      if (!activeFlowData) return;
      activeFlowData.enabled = e.target.checked;
      settingsManager.saveSettings();
      flowRunner.reinitialize();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const handleToggleDangerousPermission = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const allow = e.target.checked;
      const activeFlowData = settings.flows.find((f) => f.id === settings.activeFlow);
      if (!activeFlowData) return;
      if (allow) {
        const { Popup } = SillyTavern.getContext();
        const confirmation = await Popup.show.confirm(
          'Allow Dangerous Operations?',
          'Enabling this allows the flow to run nodes that can execute arbitrary code or make external network requests. This can be a security risk if you import a flow from an untrusted source. Do you want to proceed?',
        );
        if (confirmation) activeFlowData.allowDangerousExecution = true;
        else e.target.checked = false;
      } else {
        activeFlowData.allowDangerousExecution = false;
      }
      settingsManager.saveSettings();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const togglePalette = useCallback(() => {
    settings.isPaletteCollapsed = !settings.isPaletteCollapsed;
    settingsManager.saveSettings();
    forceUpdate();
  }, [settings, forceUpdate]);

  return (
    <div className="flowchart-editor-manager">
      <div className="flowchart-preset-selector" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <STPresetSelect
          label="Flow"
          items={flowItems}
          value={settings.activeFlow}
          onChange={handleSelectChange}
          onItemsChange={handleItemsChange}
          onCreate={handleCreateFlow}
          onRename={handleRenameFlow}
          onDelete={handleDeleteFlow}
          enableCreate
          enableRename
          enableDelete
          buttons={presetButtons}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <STInput
            type="checkbox"
            id="flow-enabled-toggle"
            checked={settings.flows.find((f) => f.id === settings.activeFlow)?.enabled ?? false}
            onChange={handleToggleFlow}
            title="Enable or disable this flow from running automatically."
          />
          <label htmlFor="flow-enabled-toggle">Enabled</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <STInput
            type="checkbox"
            id="flow-dangerous-permission-toggle"
            checked={activeFlowData?.allowDangerousExecution ?? false}
            onChange={handleToggleDangerousPermission}
            title="Allow this flow to execute dangerous nodes like Execute JS or HTTP Request. This can be a security risk."
          />
          <label htmlFor="flow-dangerous-permission-toggle">Allow Dangerous</label>
        </div>
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
          <STButton color="warning" title={errors.join('\n')}>
            Invalid ({errors.length})
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
      </div>
      <div
        className={`flowchart-editor-area ${settings.isPaletteCollapsed ? 'palette-collapsed' : ''}`}
        ref={flowWrapperRef}
      >
        <div className="palette-toggle" onClick={togglePalette} title="Toggle Node Palette">
          <i className={`fa-solid fa-chevron-${settings.isPaletteCollapsed ? 'right' : 'left'}`}></i>
        </div>
        <NodePalette />
        <FlowCanvas invalidNodeIds={invalidNodeIds} errorsByNodeId={errorsByNodeId} />
      </div>
    </div>
  );
};

export const FlowChartEditor: FC = () => {
  return (
    <ReactFlowProvider>
      <FlowManager />
    </ReactFlowProvider>
  );
};
