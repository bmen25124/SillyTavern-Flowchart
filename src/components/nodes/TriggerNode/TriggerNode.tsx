import React, { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { TriggerNodeData } from './definition.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { EventCategories, EventDescriptions, EventNames } from '../../../flow-types.js';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const allEventNames = useMemo(() => new Set(Object.values(EventNames)), []);
  const isCustom = !allEventNames.has(data?.selectedEventType);

  if (!data || !definition) return null;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      updateNodeData(id, { selectedEventType: '' }); // Clear it to force user input
    } else {
      updateNodeData(id, { selectedEventType: value });
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { selectedEventType: e.target.value });
  };

  const selectedEventDescription = EventDescriptions[data.selectedEventType];
  const displayName =
    Object.keys(EventNames).find((key) => EventNames[key] === data.selectedEventType) ?? data.selectedEventType;

  return (
    <BaseNode id={id} title="Trigger via:" selected={selected}>
      <hr />
      <label>Event</label>
      <STSelect className="nodrag" value={isCustom ? 'custom' : data.selectedEventType} onChange={handleSelectChange}>
        {Object.entries(EventCategories).map(([category, events]) => (
          <optgroup label={category} key={category}>
            {events.map((eventValue) => {
              const eventKey = Object.keys(EventNames).find((key) => EventNames[key] === eventValue) ?? eventValue;
              return (
                <option key={eventValue} value={eventValue}>
                  {eventKey}
                </option>
              );
            })}
          </optgroup>
        ))}
        <option value="custom">-- Custom Event --</option>
      </STSelect>

      {isCustom && (
        <div style={{ marginTop: '5px' }}>
          <label>Custom Event Name</label>
          <STInput
            className="nodrag"
            value={data.selectedEventType}
            onChange={handleCustomInputChange}
            placeholder="Type your custom event name"
          />
        </div>
      )}

      <div style={{ marginTop: '5px', fontSize: '11px', color: '#ccc', fontStyle: 'italic' }}>
        {selectedEventDescription && <p style={{ margin: '2px 0 0 0' }}>{selectedEventDescription}</p>}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
