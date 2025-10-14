import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { RunFlowNodeData } from './definition.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type RunFlowNodeProps = NodeProps<Node<RunFlowNodeData>>;

export const RunFlowNode: FC<RunFlowNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RunFlowNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const settings = settingsManager.getSettings();

  const flowOptions = useMemo(
    () => Object.entries(settings.flows).map(([id, { name }]) => ({ value: id, label: name })),
    [settings.flows],
  );

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'flowId',
        label: 'Flow to Run',
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
      createFieldConfig({
        id: 'parameters',
        label: 'Parameters (JSON)',
        component: CodeMirror,
        props: {
          height: '100px',
          extensions: [javascript({})],
          width: '100%',
          theme: 'dark',
          style: { cursor: 'text', marginTop: '5px' },
        },
        customChangeHandler: (value: string, { nodeId, updateNodeData }) => {
          updateNodeData(nodeId, { parameters: value });
        },
      }),
    ],
    [flowOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Run Flow" selected={selected}>
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
