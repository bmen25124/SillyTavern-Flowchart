import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { BreakLoopNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type BreakLoopNodeProps = NodeProps<Node<BreakLoopNodeData>>;

export const BreakLoopNode: FC<BreakLoopNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="Break Loop" selected={selected}>
      <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>Stops the parent "For Each" loop.</div>
    </BaseNode>
  );
};
