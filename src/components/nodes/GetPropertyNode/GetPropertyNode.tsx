import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetPropertyNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { schemaToText, flattenZodSchema } from '../../../utils/schema-inspector.js';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type GetPropertyNodeProps = NodeProps<Node<GetPropertyNodeData>>;

export const GetPropertyNode: FC<GetPropertyNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetPropertyNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const inputSchema = useInputSchema(id, 'object');

  const availableProperties = useMemo(() => {
    if (!inputSchema) return [];
    return flattenZodSchema(inputSchema);
  }, [inputSchema]);

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'path',
        label: 'Property Path',
        component: ComboBoxInput,
        props: { type: 'text', listId: `${id}-properties`, options: availableProperties },
      }),
    ],
    [id, availableProperties],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Property" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
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

      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
