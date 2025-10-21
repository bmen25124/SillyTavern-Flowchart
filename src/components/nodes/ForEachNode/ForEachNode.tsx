import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { ForEachNodeData } from './definition.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type ForEachNodeProps = NodeProps<Node<ForEachNodeData>>;

export const ForEachNode: FC<ForEachNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ForEachNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const { flows, activeFlow } = settingsManager.getSettings();

  const flowOptions = useMemo(
    () =>
      Object.values(flows)
        .filter((flow) => flow.id !== activeFlow) // Prevent recursive loops on the same flow
        .map(({ id, name }) => ({ value: id, label: name })),
    [flows, activeFlow],
  );

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'flowId',
        label: 'Flow to Run Per Item',
        component: STFancyDropdown,
        props: {
          items: flowOptions,
          multiple: false,
          inputClasses: 'nodrag',
          containerClasses: 'nodrag',
          closeOnSelect: true,
          enableSearch: true,
        },
        getValueFromEvent: (e: string[]) => e[0],
        formatValue: (value) => [value ?? ''],
      }),
    ],
    [flowOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="For Each" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />

        <div style={{ borderTop: '1px solid #555', paddingTop: '10px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};
