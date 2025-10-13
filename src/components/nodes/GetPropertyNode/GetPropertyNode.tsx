import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetPropertyNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { z } from 'zod';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type GetPropertyNodeProps = NodeProps<Node<GetPropertyNodeData>>;

// Helper to generate a flat list of dot-notation paths from a Zod schema.
function flattenZodSchema(schema: z.ZodType, prefix = ''): string[] {
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    // @ts-ignore
    return flattenZodSchema(schema.unwrap(), prefix);
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    return Object.entries(shape).flatMap(([key, value]) => flattenZodSchema(value, prefix ? `${prefix}.${key}` : key));
  }
  return prefix ? [prefix] : [];
}

const fields = [
  createFieldConfig({
    id: 'path',
    label: 'Property Path',
    component: ComboBoxInput,
    props: { type: 'text', listId: 'get-property-paths' },
  }),
];

export const GetPropertyNode: FC<GetPropertyNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetPropertyNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const inputSchema = useInputSchema(id, 'object');

  const availableProperties = useMemo(() => {
    if (!inputSchema) return [];
    return flattenZodSchema(inputSchema);
  }, [inputSchema]);

  const dynamicFields = useMemo(() => {
    return fields.map((field) => {
      if (field.id === 'path') {
        return {
          ...field,
          props: {
            ...field.props,
            listId: `${id}-properties`,
            options: availableProperties,
          },
        };
      }
      return field;
    });
  }, [availableProperties, id]);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Property" selected={selected}>
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="object"
          style={{ top: '50%', backgroundColor: FlowDataTypeColors.object }}
        />
        <label style={{ marginLeft: '10px' }}>Object</label>
      </div>

      <NodeFieldRenderer
        nodeId={id}
        nodeType={type}
        fields={dynamicFields}
        data={data}
        updateNodeData={updateNodeData}
      />
      {inputSchema && (
        <details style={{ marginTop: '5px', background: '#2a2a2a', padding: '5px', borderRadius: '3px' }}>
          <summary style={{ color: '#888', fontSize: '11px', cursor: 'pointer' }}>Available Input Properties</summary>
          <pre style={{ fontSize: '10px', color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>
            {schemaToText(inputSchema)}
          </pre>
        </details>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span>Value</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};
