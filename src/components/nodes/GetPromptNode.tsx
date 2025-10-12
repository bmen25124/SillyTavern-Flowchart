import React, { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetPromptNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../config.js';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';
import { nodeDefinitionMap } from './definitions/index.js';
import { schemaToText } from '../../utils/schema-inspector.js';

export type GetPromptNodeProps = NodeProps<Node<GetPromptNodeData>>;

const fields = [
  createFieldConfig({
    id: 'promptName',
    label: 'Prompt Name',
    component: STFancyDropdown,
    props: {
      multiple: false,
      inputClasses: 'nodrag',
      containerClasses: 'nodrag',
      closeOnSelect: true,
      enableSearch: true,
    },
    getValueFromEvent: (e: string[]) => e[0],
    formatValue: (value) => [value ?? ''],
  }),
];

export const GetPromptNode: FC<GetPromptNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetPromptNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = nodeDefinitionMap.get('getPromptNode');
  const resultHandle = definition?.handles.outputs[0];
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'promptName') {
          return { ...field, props: { ...field.props, items: promptOptions } };
        }
        return field;
      }),
    [promptOptions],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Prompt" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <div title={schemaText}>
        <Handle type="source" position={Position.Right} />
      </div>
    </BaseNode>
  );
};
