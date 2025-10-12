import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { ManualTriggerNodeData } from '../../flow-types.js';

export type ManualTriggerNodeProps = NodeProps<Node<ManualTriggerNodeData>>;

export const ManualTriggerNode: FC<ManualTriggerNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ManualTriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { payload: value });
  };

  return (
    <BaseNode id={id} title="Manual Trigger" selected={selected}>
      <label>Initial JSON Payload</label>
      <CodeMirror
        className="nodrag"
        value={data.payload || '{}'}
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
