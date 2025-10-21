import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { HandlebarNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { z } from 'zod';
import { registrator } from '../autogen-imports.js';
import { FieldConfig } from '../fieldConfig.js';

export type HandlebarNodeProps = NodeProps<Node<HandlebarNodeData>>;

export const HandlebarNode: FC<HandlebarNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as HandlebarNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const inputSchema = useInputSchema(id, 'context');
  const isInputAnObject = useMemo(() => inputSchema instanceof z.ZodObject, [inputSchema]);

  if (!data || !definition) return null;

  // Resolve fields from definition - this one is always synchronous.
  const fields = (definition.meta?.fields as FieldConfig[]) ?? [];

  return (
    <BaseNode id={id} title="Handlebar Template" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />

        {isInputAnObject && inputSchema && (
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '5px' }}>
            <b>Available properties in `context`:</b>
            <pre
              style={{
                margin: '2px 0 0 0',
                background: '#2a2a2a',
                padding: '4px',
                borderRadius: '3px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {schemaToText(inputSchema)}
            </pre>
          </div>
        )}
      </div>
      <div className="node-output-section">
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
