import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { StringToNumberNodeData } from './definition.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type StringToNumberNodeProps = NodeProps<Node<StringToNumberNodeData>>;

export const StringToNumberNode: FC<StringToNumberNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);
  if (!definition) return null;

  return (
    <BaseNode id={id} title="String to Number" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
        <div style={{ borderTop: '1px solid #555', paddingTop: '10px', marginTop: '5px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};
