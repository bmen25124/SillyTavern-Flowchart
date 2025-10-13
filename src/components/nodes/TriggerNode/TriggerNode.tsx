import React, { FC, useMemo } from 'react';
import { NodeProps, Node, Handle, Position } from '@xyflow/react';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { TriggerNodeData, EventNameParameters } from '../../../flow-types.js';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const outputHandles = useMemo(() => {
    if (!data?.selectedEventType) return null;
    const eventParams = EventNameParameters[data.selectedEventType];
    if (!eventParams) return null;

    return Object.keys(eventParams).map((paramName) => (
      <div
        key={paramName}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
      >
        <span style={{ textTransform: 'capitalize' }}>{paramName.replace(/([A-Z])/g, ' $1')}</span>
        <Handle
          type="source"
          position={Position.Right}
          id={paramName}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    ));
  }, [data?.selectedEventType]);

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
      {outputHandles && (
        <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>{outputHandles}</div>
      )}
    </BaseNode>
  );
};
