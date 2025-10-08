import React, { FC, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ComboBoxInput } from '../popup/ComboBoxInput.js';

export type StarterNodeProps = {
  id: string;
  isConnectable: boolean;
  data: {
    allEventTypes: string[];
    label: string;
    selectedEventType: string;
    onDataChange: (nodeId: string, value: string) => void;
  };
};

export const StarterNode: FC<StarterNodeProps> = ({ id, isConnectable, data }) => {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div>{data.label}</div>
      <ComboBoxInput
        value={data.selectedEventType}
        onChange={function (e: React.ChangeEvent<HTMLInputElement>): void {
          data.onDataChange(id, e.target.value);
        }}
        options={data.allEventTypes}
        listId={id}
      />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </>
  );
};
