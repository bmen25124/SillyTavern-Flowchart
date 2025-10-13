import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { StringNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { registrator } from '../autogen-imports.js';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type StringNodeProps = NodeProps<Node<StringNodeData>>;

const fields = [createFieldConfig({ id: 'value', label: 'Value', component: STInput, props: { type: 'text' } })];

export const StringNode: FC<StringNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as StringNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('stringNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'value');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;
  const isValueConnected = useIsConnected(id, 'value');

  if (!data) return null;

  return (
    <BaseNode id={id} title="String" selected={selected}>
      {!isValueConnected ? (
        <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      ) : (
        <div style={{ position: 'relative', padding: '5px 0' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="value"
            style={{ top: '50%', transform: 'translateY(-50%)', backgroundColor: FlowDataTypeColors.any }}
          />
          <label style={{ marginLeft: '10px' }}>Value</label>
          <span className="handle-label">(any)</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <div>
          <span>Value</span>
          <span className="handle-label">(string)</span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="value"
          style={{
            position: 'relative',
            transform: 'none',
            right: 0,
            top: 0,
            backgroundColor: FlowDataTypeColors.string,
          }}
          title={schemaText}
        />
      </div>
    </BaseNode>
  );
};
