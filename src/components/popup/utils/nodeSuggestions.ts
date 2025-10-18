import { Edge, Node } from '@xyflow/react';
import { registrator } from '../../nodes/autogen-imports.js';
import { NodeDefinition, HandleSpec, NodeSuggestionBlueprint } from '../../nodes/definitions/types.js';
import { FlowDataType, areFlowDataTypesCompatible, shareFlowDataTypeFamily } from '../../../flow-types.js';
import { checkConnectionValidity } from '../../../utils/connection-logic.js';

export type HandleKind = 'source' | 'target';

export type MatchQuality = 'exact' | 'convertible' | 'fallback';

export type ConnectionSuggestionDescriptor = {
  nodeType: string;
  label: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  handleDataType?: FlowDataType;
  matchQuality: MatchQuality;
  familyMatch: boolean;
  connectingDataType?: FlowDataType;
  dataOverrides?: Record<string, unknown>;
  blueprintId?: string;
};

type DirectionKey = 'inputs' | 'outputs';

type NodeMatchHandle = {
  spec: HandleSpec;
  isDynamic: boolean;
};

const mergeNodeDataWithOverrides = (initialData: any, overrides?: Record<string, unknown>) => {
  const base = structuredClone(initialData || {});
  if (!overrides) return base;
  const overrideClone = structuredClone(overrides);
  return Object.assign(base, overrideClone);
};

const getBlueprintCandidates = (
  definition: NodeDefinition,
  direction: DirectionKey,
): Array<NodeSuggestionBlueprint | undefined> => {
  const blueprints = definition.getSuggestionBlueprints?.({ direction }) ?? [];
  if (blueprints.length === 0) return [undefined];
  return [undefined, ...blueprints.map((bp) => bp || undefined)];
};

const collectHandlesForDirection = (
  definition: NodeDefinition,
  node: Node,
  direction: DirectionKey,
  nodes: Node[],
  edges: Edge[],
): NodeMatchHandle[] => {
  const staticHandles = definition.handles[direction];
  const handles: NodeMatchHandle[] = [];

  const upsertHandle = (spec: HandleSpec, isDynamic: boolean) => {
    if (!spec.id) {
      handles.push({ spec, isDynamic });
      return;
    }

    const existingIndex = handles.findIndex((handle) => handle.spec.id === spec.id);
    if (existingIndex === -1) {
      handles.push({ spec, isDynamic });
      return;
    }

    if (isDynamic) {
      handles[existingIndex] = { spec, isDynamic };
    }
  };

  for (const spec of staticHandles) {
    upsertHandle(spec, false);
  }

  if (definition.getDynamicHandles) {
    const dynamicHandles = definition.getDynamicHandles(node, nodes, edges)[direction];
    for (const spec of dynamicHandles) {
      upsertHandle(spec, true);
    }
  }

  return handles;
};

export const resolveHandleSpec = (
  definition: NodeDefinition,
  node: Node,
  direction: DirectionKey,
  handleId: string | null,
  nodes: Node[],
  edges: Edge[],
): HandleSpec | undefined => {
  return collectHandlesForDirection(definition, node, direction, nodes, edges).find(({ spec }) => spec.id === handleId)
    ?.spec;
};

const deriveMatchQuality = (connectingType?: FlowDataType, candidateType?: FlowDataType): MatchQuality => {
  if (!connectingType || !candidateType) return 'fallback';
  if (connectingType === candidateType) return 'exact';
  if (areFlowDataTypesCompatible(connectingType, candidateType)) return 'convertible';
  return 'fallback';
};

const formatConnectionLabel = (baseLabel: string, handle: HandleSpec): string => {
  return handle.id ? `${baseLabel} (${handle.id})` : baseLabel;
};

const getSuggestionPriority = (suggestion: ConnectionSuggestionDescriptor): number => {
  const { matchQuality, familyMatch, connectingDataType, handleDataType } = suggestion;
  if (matchQuality === 'exact') return 0;
  if (connectingDataType && handleDataType && connectingDataType === handleDataType) return 0;
  if (familyMatch && matchQuality === 'convertible') return 1;
  if (matchQuality === 'convertible') return 2;
  return 3;
};

export const sortConnectionSuggestions = (
  suggestions: ConnectionSuggestionDescriptor[],
): ConnectionSuggestionDescriptor[] => {
  return [...suggestions].sort((a, b) => {
    const priorityDiff = getSuggestionPriority(a) - getSuggestionPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.handleDataType && b.handleDataType && a.handleDataType !== b.handleDataType) {
      return a.handleDataType.localeCompare(b.handleDataType);
    }

    return a.label.localeCompare(b.label);
  });
};

type GenerateSuggestionsParams = {
  startNode: Node;
  startHandleId: string | null;
  handleKind: HandleKind;
  nodes: Node[];
  edges: Edge[];
  connectingDataType?: FlowDataType;
};

export const generateConnectionSuggestions = ({
  startNode,
  startHandleId,
  handleKind,
  nodes,
  edges,
  connectingDataType,
}: GenerateSuggestionsParams): ConnectionSuggestionDescriptor[] => {
  const suggestions: ConnectionSuggestionDescriptor[] = [];

  if (handleKind === 'source') {
    for (const targetDef of registrator.allNodeDefinitions) {
      const blueprintCandidates = getBlueprintCandidates(targetDef, 'inputs');
      for (const blueprint of blueprintCandidates) {
        const tempTargetNode = {
          id: 'temp-target',
          type: targetDef.type,
          data: mergeNodeDataWithOverrides(
            targetDef.initialData,
            (blueprint?.dataOverrides as Record<string, unknown> | undefined) ?? undefined,
          ),
          position: { x: 0, y: 0 },
        } as Node;
        const nodesWithTemp = [...nodes, tempTargetNode];
        const targetHandles = collectHandlesForDirection(targetDef, tempTargetNode, 'inputs', nodesWithTemp, edges);

        for (const { spec } of targetHandles) {
          if (
            checkConnectionValidity(
              {
                source: startNode.id,
                sourceHandle: startHandleId,
                target: tempTargetNode.id,
                targetHandle: spec.id ?? null,
              },
              nodesWithTemp,
              edges,
            )
          ) {
            const nodeLabel = blueprint?.labelSuffix ? `${targetDef.label} ${blueprint.labelSuffix}` : targetDef.label;
            suggestions.push({
              nodeType: targetDef.type,
              label: formatConnectionLabel(nodeLabel, spec),
              sourceHandle: startHandleId,
              targetHandle: spec.id ?? null,
              handleDataType: spec.type,
              matchQuality: deriveMatchQuality(connectingDataType, spec.type),
              familyMatch:
                !!connectingDataType && !!spec.type && shareFlowDataTypeFamily(connectingDataType, spec.type),
              connectingDataType,
              dataOverrides: blueprint?.dataOverrides
                ? (structuredClone(blueprint.dataOverrides) as Record<string, unknown>)
                : undefined,
              blueprintId: blueprint?.id,
            });
          }
        }
      }
    }
  } else {
    for (const sourceDef of registrator.allNodeDefinitions) {
      const blueprintCandidates = getBlueprintCandidates(sourceDef, 'outputs');
      for (const blueprint of blueprintCandidates) {
        const tempSourceNode = {
          id: 'temp-source',
          type: sourceDef.type,
          data: mergeNodeDataWithOverrides(
            sourceDef.initialData,
            (blueprint?.dataOverrides as Record<string, unknown> | undefined) ?? undefined,
          ),
          position: { x: 0, y: 0 },
        } as Node;
        const nodesWithTemp = [...nodes, tempSourceNode];
        const sourceHandles = collectHandlesForDirection(sourceDef, tempSourceNode, 'outputs', nodesWithTemp, edges);

        for (const { spec } of sourceHandles) {
          if (
            checkConnectionValidity(
              {
                source: tempSourceNode.id,
                sourceHandle: spec.id ?? null,
                target: startNode.id,
                targetHandle: startHandleId,
              },
              nodesWithTemp,
              edges,
            )
          ) {
            const nodeLabel = blueprint?.labelSuffix ? `${sourceDef.label} ${blueprint.labelSuffix}` : sourceDef.label;
            suggestions.push({
              nodeType: sourceDef.type,
              label: formatConnectionLabel(nodeLabel, spec),
              sourceHandle: spec.id ?? null,
              targetHandle: startHandleId,
              handleDataType: spec.type,
              matchQuality: deriveMatchQuality(connectingDataType, spec.type),
              familyMatch:
                !!connectingDataType && !!spec.type && shareFlowDataTypeFamily(connectingDataType, spec.type),
              connectingDataType,
              dataOverrides: blueprint?.dataOverrides
                ? (structuredClone(blueprint.dataOverrides) as Record<string, unknown>)
                : undefined,
              blueprintId: blueprint?.id,
            });
          }
        }
      }
    }
  }

  return suggestions;
};

export const createNodeInitialData = (definition: NodeDefinition, overrides?: Record<string, unknown>) => {
  const data = mergeNodeDataWithOverrides(definition.initialData, overrides);
  data._version = definition.currentVersion;
  return data;
};
