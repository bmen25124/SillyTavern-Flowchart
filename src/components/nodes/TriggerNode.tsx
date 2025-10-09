import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ComboBoxInput } from '../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { useFlow } from '../popup/FlowContext.js';
import { BaseNode } from './BaseNode.js';

export type TriggerNodeData = {
  selectedEventType: string;
};

export type TriggerNodeProps = {
  id: string;
  isConnectable: boolean;
  data: TriggerNodeData;
};

export const TriggerNode: FC<TriggerNodeProps> = ({ id, isConnectable, data }) => {
  const { updateNodeData } = useFlow();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { selectedEventType: e.target.value });
  };

  return (
    <BaseNode id={id} title="Trigger via:">
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
