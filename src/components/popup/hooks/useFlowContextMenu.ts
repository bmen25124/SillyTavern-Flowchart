import { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Connection, Edge, Node, OnConnectStartParams } from '@xyflow/react';
import { flowRunner } from '../../../FlowRunner.js';
import { settingsManager } from '../../../config.js';
import { notify } from '../../../utils/notify.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import {
  ConnectionSuggestionDescriptor,
  HandleKind,
  MatchQuality,
  createNodeInitialData,
  generateConnectionSuggestions,
  resolveHandleSpec,
  sortConnectionSuggestions,
} from '../utils/nodeSuggestions.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../../nodes/autogen-imports.js';

type DeleteElementsFn = (params: { nodes?: Node[]; edges?: Edge[] }) => void;

type AddNodeFn = (node: Omit<Node, 'id'>) => Node;

export type ContextMenuItemBase = {
  label: string;
  action: () => void;
};

export type ActionMenuItem = ContextMenuItemBase & {
  kind: 'action';
};

export type ConnectionSuggestionMeta = {
  nodeType: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  handleKind: HandleKind;
  targetDataType?: FlowDataType;
  matchQuality: MatchQuality;
  familyMatch: boolean;
  connectingDataType?: FlowDataType;
  blueprintId?: string;
};

export type ConnectionSuggestionItem = ContextMenuItemBase & {
  kind: 'connectionSuggestion';
  meta: ConnectionSuggestionMeta;
};

export type ContextMenuItem = ActionMenuItem | ConnectionSuggestionItem;

export type MenuFilterState = {
  searchTerm: string;
  showSearch: boolean;
};

export type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  filter: MenuFilterState;
};

type ConnectionContext = {
  nodeId: string;
  handleId: string | null;
  handleKind: HandleKind;
  dataType?: FlowDataType;
};

type UseFlowContextMenuOptions = {
  edges: Edge[];
  getNodes: () => Node[];
  addNode: AddNodeFn;
  duplicateNode: (nodeId: string) => void;
  toggleNodeDisabled: (nodeIds: string[]) => void;
  copySelection: () => void;
  setNodes: (nodes: Node[]) => void;
  deleteElements: DeleteElementsFn;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  resume: () => void;
  baseOnConnect: (connection: Connection) => void;
};

export type UseFlowContextMenuResult = {
  contextMenu: ContextMenuState | null;
  filteredMenuOptions: ContextMenuItem[];
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: MouseEvent | TouchEvent, params: OnConnectStartParams) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  onNodeContextMenu: (event: ReactMouseEvent, node: Node) => void;
  onPaneContextMenu: (event: ReactMouseEvent | MouseEvent) => void;
  onPaneClick: () => void;
  closeContextMenu: () => void;
  updateSearchTerm: (value: string) => void;
};

export const useFlowContextMenu = ({
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
}: UseFlowContextMenuOptions): UseFlowContextMenuResult => {
  const connectionContextRef = useRef<ConnectionContext | null>(null);
  const wasConnectionSuccessful = useRef(false);
  const menuJustOpened = useRef(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const debouncedSearchTerm = useDebounce(contextMenu?.filter.searchTerm ?? '', 200);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    connectionContextRef.current = null;
    menuJustOpened.current = false;
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      wasConnectionSuccessful.current = true;
      baseOnConnect(connection);
    },
    [baseOnConnect],
  );

  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      const handleKind = params.handleType === 'source' || params.handleType === 'target' ? params.handleType : null;
      if (!handleKind || !params.nodeId) {
        connectionContextRef.current = null;
        wasConnectionSuccessful.current = false;
        return;
      }

      const allNodes = getNodes();
      const startNode = allNodes.find((n) => n.id === params.nodeId);
      let dataType: FlowDataType | undefined;

      if (startNode && startNode.type) {
        const definition = registrator.nodeDefinitionMap.get(startNode.type);
        if (definition) {
          const spec = resolveHandleSpec(
            definition,
            startNode,
            handleKind === 'source' ? 'outputs' : 'inputs',
            params.handleId ?? null,
            allNodes,
            edges,
          );
          dataType = spec?.type;
        }
      }

      connectionContextRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId ?? null,
        handleKind,
        dataType,
      };
      wasConnectionSuccessful.current = false;
    },
    [getNodes, edges],
  );

  const onPaneClick = useCallback(() => {
    if (menuJustOpened.current) {
      menuJustOpened.current = false;
      return;
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      event.preventDefault();
      resume();
      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) return;
      const bounds = editorArea.getBoundingClientRect();
      const { activeFlow } = settingsManager.getSettings();

      menuJustOpened.current = true;
      connectionContextRef.current = null;
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        items: [
          {
            kind: 'action',
            label: 'Copy',
            action: () => {
              setNodes(getNodes().map((n) => ({ ...n, selected: n.id === node.id })));
              setTimeout(() => {
                copySelection();
                notify('info', `Node '${(node.data as any).label || node.type}' copied.`, 'ui_action');
              }, 50);
              closeContextMenu();
            },
          },
          {
            kind: 'action',
            label: 'Duplicate',
            action: () => {
              duplicateNode(node.id);
              closeContextMenu();
            },
          },
          {
            kind: 'action',
            label: 'Run From Here',
            action: () => {
              flowRunner.runFlowFromNode(activeFlow, node.id);
              closeContextMenu();
            },
          },
          {
            kind: 'action',
            label: 'Run To Here',
            action: () => {
              flowRunner.runFlowToNode(activeFlow, node.id);
              closeContextMenu();
            },
          },
          {
            kind: 'action',
            label: 'Delete',
            action: () => {
              deleteElements({ nodes: [node] });
              closeContextMenu();
            },
          },
          {
            kind: 'action',
            label: node.data.disabled ? 'Enable' : 'Disable',
            action: () => {
              toggleNodeDisabled([node.id]);
              closeContextMenu();
            },
          },
        ],
        filter: { showSearch: false, searchTerm: '' },
      });
    },
    [duplicateNode, deleteElements, toggleNodeDisabled, copySelection, setNodes, getNodes, resume, closeContextMenu],
  );

  const onPaneContextMenu = useCallback(
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
      connectionContextRef.current = null;
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        items: registrator.allNodeDefinitions.map((def) => ({
          kind: 'action',
          label: def.label,
          action: () => {
            createNode(def.type, createNodeInitialData(def));
            closeContextMenu();
          },
        })),
        filter: { showSearch: true, searchTerm: '' },
      });
    },
    [screenToFlowPosition, addNode, resume, closeContextMenu],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const connectionContext = connectionContextRef.current;
      if (!connectionContext || wasConnectionSuccessful.current) {
        connectionContextRef.current = null;
        if (wasConnectionSuccessful.current) wasConnectionSuccessful.current = false;
        return;
      }

      event.stopPropagation();
      const {
        nodeId: startNodeId,
        handleId: startHandleId,
        handleKind,
        dataType: connectingHandleType,
      } = connectionContext;
      const allCurrentNodes = getNodes();
      const startNode = allCurrentNodes.find((n) => n.id === startNodeId);

      if (!startNode || !startNode.type) {
        connectionContextRef.current = null;
        return;
      }

      resume();

      const suggestions = sortConnectionSuggestions(
        generateConnectionSuggestions({
          startNode,
          startHandleId,
          handleKind,
          nodes: allCurrentNodes,
          edges,
          connectingDataType: connectingHandleType,
        }),
      );

      if (suggestions.length === 0) {
        connectionContextRef.current = null;
        return;
      }

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const editorArea = (event.target as HTMLElement).closest('.flowchart-editor-area');
      if (!editorArea) {
        connectionContextRef.current = null;
        return;
      }
      const bounds = editorArea.getBoundingClientRect();
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      const menuX = clientX - bounds.left;
      const menuY = clientY - bounds.top;

      const createAndConnectNode = (suggestion: ConnectionSuggestionDescriptor) => {
        const nodeDef = registrator.nodeDefinitionMap.get(suggestion.nodeType);
        if (!nodeDef) return;

        closeContextMenu();

        const nodeXOffset = handleKind === 'source' ? 50 : -250;
        const nodeData = createNodeInitialData(
          nodeDef,
          suggestion.dataOverrides as Record<string, unknown> | undefined,
        );
        const newNode = addNode({
          type: suggestion.nodeType,
          position: { x: position.x + nodeXOffset, y: position.y },
          data: nodeData,
        });
        const connection =
          handleKind === 'source'
            ? {
                source: startNodeId,
                sourceHandle: suggestion.sourceHandle,
                target: newNode.id,
                targetHandle: suggestion.targetHandle,
              }
            : {
                source: newNode.id,
                sourceHandle: suggestion.sourceHandle,
                target: startNodeId,
                targetHandle: suggestion.targetHandle,
              };
        connectionContextRef.current = null;
        setTimeout(() => onConnect(connection as Connection), 10);
      };

      if (suggestions.length === 1) {
        createAndConnectNode(suggestions[0]);
        return;
      }

      let finalMenuX = menuX;
      let finalMenuY = menuY;
      if (finalMenuX + 220 > bounds.width) finalMenuX -= 220;
      if (finalMenuY + 300 > bounds.height) finalMenuY = bounds.height - 310;
      menuJustOpened.current = true;

      setContextMenu({
        x: finalMenuX,
        y: finalMenuY,
        items: suggestions.map((suggestion) => ({
          kind: 'connectionSuggestion',
          label: suggestion.label,
          action: () => createAndConnectNode(suggestion),
          meta: {
            nodeType: suggestion.nodeType,
            sourceHandle: suggestion.sourceHandle,
            targetHandle: suggestion.targetHandle,
            handleKind,
            targetDataType: suggestion.handleDataType,
            matchQuality: suggestion.matchQuality,
            familyMatch: suggestion.familyMatch,
            connectingDataType: suggestion.connectingDataType,
            blueprintId: suggestion.blueprintId,
          },
        })),
        filter: { showSearch: true, searchTerm: '' },
      });

      connectionContextRef.current = null;
    },
    [getNodes, edges, resume, screenToFlowPosition, addNode, closeContextMenu, onConnect],
  );

  const filteredMenuOptions = useMemo(() => {
    if (!contextMenu) return [];
    if (!contextMenu.filter.showSearch || !debouncedSearchTerm) return contextMenu.items;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return contextMenu.items.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [contextMenu, debouncedSearchTerm]);

  const updateSearchTerm = useCallback((value: string) => {
    setContextMenu((currentMenu) =>
      currentMenu ? { ...currentMenu, filter: { ...currentMenu.filter, searchTerm: value } } : null,
    );
  }, []);

  return {
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
  };
};
