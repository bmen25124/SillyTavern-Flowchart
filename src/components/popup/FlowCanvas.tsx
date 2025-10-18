import { FC, useCallback, useEffect, useMemo } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Edge,
  MiniMap,
  BackgroundVariant,
  OnNodeDrag,
  useReactFlow,
} from '@xyflow/react';
import { STInput } from 'sillytavern-utils-lib/components';
import { useFlowStore } from './flowStore.js';
import { useFlowRunStore } from './flowRunStore.js';
import { checkConnectionValidity } from '../../utils/connection-logic.js';
import { getHandleSpec } from '../../utils/handle-logic.js';
import { useFlowContextMenu, ContextMenuState } from './hooks/useFlowContextMenu.js';
import { FlowDataType, FlowDataTypeColors } from '../../flow-types.js';
import type { ValidationIssue } from '../nodes/definitions/types.js';
import { registrator } from '../nodes/autogen-imports.js';
import { createNodeInitialData } from './utils/nodeSuggestions.js';

type FlowCanvasProps = {
  invalidNodeIds: Set<string>;
  errorsByNodeId: Map<string, ValidationIssue[]>;
};

export const FlowCanvas: FC<FlowCanvasProps> = ({ invalidNodeIds, errorsByNodeId }) => {
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
    setEdges,
  } = useFlowStore();
  const { screenToFlowPosition, getNodes, deleteElements } = useReactFlow();
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

  const {
    contextMenu,
    filteredMenuOptions,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeContextMenu,
    onPaneContextMenu,
    onPaneClick,
    closeContextMenu,
    updateSearchTerm,
  } = useFlowContextMenu({
    edges,
    getNodes,
    addNode,
    duplicateNode,
    toggleNodeDisabled,
    copySelection,
    setNodes,
    deleteElements,
    screenToFlowPosition,
    resume,
    baseOnConnect,
  });

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => checkConnectionValidity(connection, getNodes(), edges),
    [getNodes, edges],
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

  const styledEdges = useMemo(() => {
    const allNodes = getNodes();
    return edges.map((edge) => {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) return edge;

      const handleSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, edges);
      const color = FlowDataTypeColors[handleSpec?.type ?? FlowDataType.ANY];

      return { ...edge, style: { stroke: color, strokeWidth: 2 } };
    });
  }, [edges, getNodes]);

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    pause();
    closeContextMenu();
  }, [pause, closeContextMenu]);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    resume();
  }, [resume]);

  const onDragOver = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow/node-type');
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const nodeDef = registrator.nodeDefinitionMap.get(nodeType);

      if (!nodeDef) return;

      addNode({
        type: nodeType,
        position,
        data: createNodeInitialData(nodeDef),
      });
    },
    [screenToFlowPosition, addNode],
  );

  const renderContextMenu = (menu: ContextMenuState | null) => {
    if (!menu) return null;
    return (
      <div
        className="flowchart-context-menu"
        style={{ top: menu.y, left: menu.x }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {menu.filter.showSearch && (
          <div className="context-menu-search-wrapper">
            <STInput
              type="text"
              placeholder="Search to add..."
              value={menu.filter.searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
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
          ) : menu.filter.showSearch ? (
            <li className="no-results">No matching nodes</li>
          ) : (
            <li className="no-actions">No actions</li>
          )}
        </ul>
      </div>
    );
  };

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
        onEdgeClick={(_, edge) => {
          setEdges(edges.map((e) => ({ ...e, selected: e.id === edge.id })));
        }}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
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
      {renderContextMenu(contextMenu)}
    </div>
  );
};
