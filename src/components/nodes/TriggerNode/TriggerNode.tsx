import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { TriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { EventNames } from 'sillytavern-utils-lib/types';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { selectedEventType: e.target.value });
  };

  return (
    <BaseNode id={id} title="Trigger via:" selected={selected}>
      <hr />
      <label>Event</label>
      <ComboBoxInput
        className="nodrag"
        value={data.selectedEventType}
        onChange={handleChange}
        options={Object.values(EventNames)}
        listId={id}
      />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
