import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { OnStreamTriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type OnStreamTriggerNodeProps = NodeProps<Node<OnStreamTriggerNodeData>>;

export const OnStreamTriggerNode: FC<OnStreamTriggerNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="On Stream Trigger" selected={selected}>
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>
        Starts a flow for each token from an LLM stream.
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
