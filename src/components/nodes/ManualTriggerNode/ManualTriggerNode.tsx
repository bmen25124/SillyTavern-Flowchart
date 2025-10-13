import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { ManualTriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type ManualTriggerNodeProps = NodeProps<Node<ManualTriggerNodeData>>;

export const ManualTriggerNode: FC<ManualTriggerNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ManualTriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const currentNode = useFlowStore((state) => state.nodesMap.get(id));

  const outputHandles = useMemo(() => {
    if (!currentNode) return [];
    const definition = registrator.nodeDefinitionMap.get('manualTriggerNode');
    if (!definition?.getDynamicHandles) return [];
    return definition.getDynamicHandles(currentNode, [], []).outputs;
  }, [currentNode]);

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
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {outputHandles.map((handle) => {
          const schemaText = handle.schema ? schemaToText(handle.schema) : handle.type;
          const label = handle.id === 'result' ? 'Result (Full Payload)' : handle.id;

          return (
            <div
              key={handle.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
              title={schemaText}
            >
              <div>
                <span>{label}</span>
                <span className="handle-label">({handle.type})</span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id!}
                style={{
                  position: 'relative',
                  transform: 'none',
                  right: 0,
                  top: 0,
                  backgroundColor: FlowDataTypeColors[handle.type],
                }}
              />
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
};
