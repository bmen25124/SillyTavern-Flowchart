import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { EndNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type EndNodeProps = NodeProps<Node<EndNodeData>>;

export const EndNode: FC<EndNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="End Flow" selected={selected}>
      <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>Execution stops here.</div>
    </BaseNode>
  );
};
