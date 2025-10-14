import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetPromptNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type GetPromptNodeProps = NodeProps<Node<GetPromptNodeData>>;

export const GetPromptNode: FC<GetPromptNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetPromptNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'promptName',
        label: 'Prompt Name',
        component: STFancyDropdown,
        props: {
          items: promptOptions,
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
    [promptOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Prompt" selected={selected}>
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
