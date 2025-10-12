import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { ExecuteJsNodeData } from '../../flow-types.js';
import { shallow } from 'zustand/shallow';

export type ExecuteJsNodeProps = NodeProps<Node<ExecuteJsNodeData>>;

export const ExecuteJsNode: FC<ExecuteJsNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as ExecuteJsNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { code: value });
  };

  return (
    <BaseNode id={id} title="Execute JS Code" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <label>Code (input and stContext are available)</label>
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
