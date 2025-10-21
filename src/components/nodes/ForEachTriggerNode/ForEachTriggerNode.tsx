import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { ForEachTriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type ForEachTriggerNodeProps = NodeProps<Node<ForEachTriggerNodeData>>;

export const ForEachTriggerNode: FC<ForEachTriggerNodeProps> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title="For Each Trigger" selected={selected}>
      <div style={{ borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '10px' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
        <p style={{ fontSize: '11px', color: '#ccc', margin: '4px 0 0 0' }}>
          Connect a Schema to provide a strong type for the 'item' output.
        </p>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
