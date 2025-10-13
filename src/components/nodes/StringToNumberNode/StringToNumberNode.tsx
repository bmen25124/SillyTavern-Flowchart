import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { StringToNumberNodeData } from './definition.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type StringToNumberNodeProps = NodeProps<Node<StringToNumberNodeData>>;

export const StringToNumberNode: FC<StringToNumberNodeProps> = ({ id, selected }) => {
  return (
    <BaseNode id={id} title="String to Number" selected={selected}>
      <div style={{ position: 'relative', padding: '5px 0' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="string"
          style={{ top: '50%', transform: 'translateY(-50%)', backgroundColor: FlowDataTypeColors.string }}
        />
        <label style={{ marginLeft: '10px' }}>String</label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <div>
          <span>Result</span>
          <span className="handle-label">(number)</span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{
            position: 'relative',
            transform: 'none',
            right: 0,
            top: 0,
            backgroundColor: FlowDataTypeColors.number,
          }}
        />
      </div>
    </BaseNode>
  );
};
