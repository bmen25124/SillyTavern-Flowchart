import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { GetChatInputNodeData } from './definition.js';

export type GetChatInputNodeProps = NodeProps<Node<GetChatInputNodeData>>;

export const GetChatInputNode: FC<GetChatInputNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="Get Chat Input" selected={selected}>
      <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>Outputs current input text.</div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
