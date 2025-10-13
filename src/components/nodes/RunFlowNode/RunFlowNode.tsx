import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { RunFlowNodeData } from './definition.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';

export type RunFlowNodeProps = NodeProps<Node<RunFlowNodeData>>;

export const RunFlowNode: FC<RunFlowNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RunFlowNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const settings = settingsManager.getSettings();

  const flowOptions = useMemo(
    () => Object.keys(settings.flows).map((name) => ({ value: name, label: name })),
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
    ],
    [flowOptions],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Run Flow" selected={selected}>
      <Handle type="target" position={Position.Left} id={null} style={{ top: '10%' }} />
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />

      <div style={{ marginTop: '10px' }}>
        <label>Parameters (JSON)</label>
        <Handle type="target" position={Position.Left} id="parameters" style={{ top: '60%' }} />
        <CodeMirror
          className="nodrag"
          value={data.parameters || '{}'}
          height="100px"
          extensions={[javascript({})]}
          width="100%"
          onChange={(value) => updateNodeData(id, { parameters: value })}
          theme={'dark'}
          style={{ cursor: 'text' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Last Output</span>
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};
