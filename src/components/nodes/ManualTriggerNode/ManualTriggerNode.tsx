import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { ManualTriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type ManualTriggerNodeProps = NodeProps<Node<ManualTriggerNodeData>>;

export const ManualTriggerNode: FC<ManualTriggerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ManualTriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { payload: value });
  };

  return (
    <BaseNode id={id} title="Manual / Sub-Flow Trigger" selected={selected}>
      <div style={{ borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '10px' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
        <p style={{ fontSize: '11px', color: '#ccc', margin: '4px 0 0 0' }}>
          Connect a Schema node to define typed inputs for this sub-flow.
        </p>
      </div>

      <label>Default Payload (for manual runs)</label>
      <CodeMirror
        className="nodrag"
        value={data.payload || '{}'}
        height="100px"
        extensions={[javascript({})]}
        width="100%"
        onChange={handleCodeChange}
        theme={'dark'}
        style={{ cursor: 'text' }}
      />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
