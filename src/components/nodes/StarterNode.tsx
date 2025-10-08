import React, { FC, memo } from 'react';
import { z } from 'zod';

import { Handle, Position } from '@xyflow/react';
import { ComboBoxInput } from '../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<EventNames, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
}

export type StarterNodeProps = {
  id: string;
  isConnectable: boolean;
  data: {
    selectedEventType: string;
    onDataChange: (nodeId: string, value: string) => void;
  };
};

export const StarterNode: FC<StarterNodeProps> = ({ id, isConnectable, data }) => {
  return (
    <>
      <div>Trigger via:</div>
      <hr />
      <label>Event</label>
      <ComboBoxInput
        value={data.selectedEventType}
        onChange={function (e: React.ChangeEvent<HTMLInputElement>): void {
          data.onDataChange(id, e.target.value);
        }}
        options={Object.values(EventNames)}
        listId={id}
      />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </>
  );
};
