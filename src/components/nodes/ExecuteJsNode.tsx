import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { ExecuteJsNodeData } from '../../flow-types.js';
import { useInputSchema } from '../../hooks/useInputSchema.js';
import { schemaToText } from '../../utils/schema-inspector.js';

export type ExecuteJsNodeProps = NodeProps<Node<ExecuteJsNodeData>>;

export const ExecuteJsNode: FC<ExecuteJsNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ExecuteJsNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const inputSchema = useInputSchema(id, null);

  if (!data) return null;

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { code: value });
  };

  return (
    <BaseNode id={id} title="Execute JS Code" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <label>Code (`input` and `stContext` are available)</label>
      {inputSchema && (
        <div style={{ fontSize: '10px', color: '#aaa', margin: '5px 0' }}>
          <b>Available properties in `input`:</b>
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
      <CodeMirror
        className="nodrag"
        value={data.code || ''}
        height="150px"
        extensions={[javascript({})]}
        width="100%"
        onChange={handleCodeChange}
        theme={'dark'}
        style={{ cursor: 'text' }}
      />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};
