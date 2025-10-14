import React, { FC, useEffect } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { TriggerNodeData } from './definition.js';
import { EventNameParameters } from '../../../flow-types.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type TriggerNodeProps = NodeProps<Node<TriggerNodeData>>;

export const TriggerNode: FC<TriggerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const edges = useFlowStore((state) => state.edges);
  const setEdges = useFlowStore((state) => state.setEdges);
  const definition = registrator.nodeDefinitionMap.get(type);

  useEffect(() => {
    if (!data) return;
    const eventParams = EventNameParameters[data.selectedEventType] || {};
    const existingHandleIds = new Set(Object.keys(eventParams));
    const filteredEdges = edges.filter(
      (edge) => !(edge.source === id && edge.sourceHandle && !existingHandleIds.has(edge.sourceHandle)),
    );
    if (filteredEdges.length < edges.length) {
      setEdges(filteredEdges);
    }
  }, [data?.selectedEventType, id, setEdges, edges]);

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
