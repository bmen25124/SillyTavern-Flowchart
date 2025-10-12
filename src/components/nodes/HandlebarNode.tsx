import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { HandlebarNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STTextarea } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';
import { useInputSchema } from '../../hooks/useInputSchema.js';
import { schemaToText } from '../../utils/schema-inspector.js';

export type HandlebarNodeProps = NodeProps<Node<HandlebarNodeData>>;

const fields = [
  createFieldConfig({
    id: 'template',
    label: 'Template',
    component: STTextarea,
    props: { rows: 4 },
  }),
];

export const HandlebarNode: FC<HandlebarNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as HandlebarNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isDataConnected = useIsConnected(id, 'data');
  const inputSchema = useInputSchema(id, 'data');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Handlebar Template" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="data"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Data (Context)</label>
          {!isDataConnected && <span style={{ fontSize: '10px', color: '#888' }}> (Requires connection)</span>}
          {isDataConnected && inputSchema && (
            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '5px', marginLeft: '10px' }}>
              <b>Available properties in `data`:</b>
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
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};
