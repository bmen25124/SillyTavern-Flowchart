import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode.js';
import { NodeHandleRenderer } from './NodeHandleRenderer.js';
import { registrator } from './registrator.js';

export const SimpleDisplayNode: FC<NodeProps<Node<any>>> = ({ id, selected, type }) => {
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!definition) return null;

  return (
    <BaseNode id={id} title={definition.label} selected={selected}>
      {definition.handles.inputs.length > 0 && <NodeHandleRenderer nodeId={id} definition={definition} type="input" />}

      {definition.meta?.description && (
        <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>{definition.meta.description}</div>
      )}

      {definition.handles.outputs.length > 0 && (
        <div className="node-output-section">
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      )}
    </BaseNode>
  );
};
