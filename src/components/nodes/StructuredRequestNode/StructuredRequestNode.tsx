import React, { FC, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { StructuredRequestNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { PromptEngineeringMode } from '../../../config.js';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type StructuredRequestNodeProps = NodeProps<Node<StructuredRequestNodeData>>;

const fields = [
  createFieldConfig({
    id: 'profileId',
    label: 'Connection Profile',
    component: STConnectionProfileSelect,
    props: {
      onChange: (profile?: ConnectionProfile) => {}, // This will be replaced in the component
    },
  }),
  createFieldConfig({
    id: 'schemaName',
    label: 'Schema Name',
    component: STInput,
    props: { type: 'text' },
  }),
  createFieldConfig({
    id: 'promptEngineeringMode',
    label: 'Prompt Engineering Mode',
    component: STSelect,
    props: {
      children: Object.values(PromptEngineeringMode).map((mode) => (
        <option key={mode} value={mode}>
          {mode}
        </option>
      )),
    },
  }),
  createFieldConfig({
    id: 'maxResponseToken',
    label: 'Max Response Token',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
];

export const StructuredRequestNode: FC<StructuredRequestNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as StructuredRequestNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const allNodes = useFlowStore((state) => state.nodes);
  const currentNode = useFlowStore((state) => state.nodesMap.get(id));
  const edges = useEdges();

  const isMessagesConnected = useIsConnected(id, 'messages');
  const isSchemaConnected = useIsConnected(id, 'schema');

  const outputHandles = useMemo(() => {
    if (!currentNode) return [];
    const definition = registrator.nodeDefinitionMap.get(currentNode.type!);
    if (!definition) return [];

    const dynamicHandles = definition.getDynamicHandles
      ? definition.getDynamicHandles(currentNode, allNodes, edges)
      : { inputs: [], outputs: [] };

    const staticHandles = definition.handles.outputs.filter(
      (staticHandle) => !dynamicHandles.outputs.some((dynamicHandle) => dynamicHandle.id === staticHandle.id),
    );

    return [...staticHandles, ...dynamicHandles.outputs];
  }, [currentNode, allNodes, edges]);

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'profileId') {
          return {
            ...field,
            props: {
              ...field.props,
              initialSelectedProfileId: data?.profileId,
              onChange: (profile?: ConnectionProfile) => {
                updateNodeData(id, { profileId: profile?.id || '' });
              },
            },
          };
        }
        if (field.id === 'promptEngineeringMode') {
          return {
            ...field,
            props: {
              ...field.props,
              value: data?.promptEngineeringMode ?? PromptEngineeringMode.NATIVE,
            },
          };
        }
        return field;
      }),
    [data?.profileId, data?.promptEngineeringMode, updateNodeData, id],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Structured Request" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="messages"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Messages</label>
          {!isMessagesConnected && <span style={{ fontSize: '10px', color: '#888' }}> (Requires connection)</span>}
        </div>

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="schema"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Schema</label>
          {!isSchemaConnected && <span style={{ fontSize: '10px', color: '#888' }}> (Requires connection)</span>}
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {outputHandles.map((handle) => {
          const schemaText = handle.schema ? schemaToText(handle.schema) : handle.type;
          const label = handle.id === 'result' ? 'Result (Full Object)' : handle.id;

          return (
            <div
              key={handle.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
              title={schemaText}
            >
              <span>{label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id!}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
};
