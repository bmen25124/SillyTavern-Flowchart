import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { ContinueLoopNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type ContinueLoopNodeProps = NodeProps<Node<ContinueLoopNodeData>>;

export const ContinueLoopNode: FC<ContinueLoopNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="Continue Loop" selected={selected}>
      <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>
        Skips to the next item in the "For Each" loop.
      </div>
    </BaseNode>
  );
};
