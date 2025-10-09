import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { ComboBoxInput } from '../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { useFlow } from '../popup/FlowContext.js';
import { BaseNode } from './BaseNode.js';
import { TriggerNodeData } from '../../flow-types.js';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();

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
    </BaseNode>
  );
};
