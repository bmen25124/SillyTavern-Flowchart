import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { ComboBoxInput } from '../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { TriggerNodeData } from '../../flow-types.js';
import { shallow } from 'zustand/shallow';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as TriggerNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

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
