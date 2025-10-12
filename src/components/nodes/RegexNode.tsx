import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RegexNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STSelect, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type RegexNodeProps = NodeProps<Node<RegexNodeData>>;

const fields = [
  createFieldConfig({
    id: 'mode',
    label: 'Mode',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="sillytavern">SillyTavern</option>
          <option value="custom">Custom</option>
        </>
      ),
    },
  }),
  createFieldConfig({
    id: 'scriptId',
    label: 'Regex Script',
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

export const RegexNode: FC<RegexNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RegexNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);

  useEffect(() => {
    const loadedRegexes = SillyTavern.getContext().extensionSettings.regex ?? [];
    setAllRegexes(loadedRegexes);
  }, []);

  const regexOptions = useMemo(() => allRegexes.map((r) => ({ value: r.id, label: r.scriptName })), [allRegexes]);

  const mode = data.mode ?? 'sillytavern';

  const dynamicFields = useMemo(
    () =>
      fields
        .filter((field) => {
          if (mode === 'sillytavern') return field.id === 'mode' || field.id === 'scriptId';
          if (mode === 'custom') return field.id === 'mode';
          return true;
        })
        .map((field) => {
          if (field.id === 'scriptId') {
            return { ...field, props: { ...field.props, items: regexOptions } };
          }
          return field;
        }),
    [mode, regexOptions],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Regex" selected={selected}>
      <Handle type="target" position={Position.Left} id="string" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />

        {mode === 'custom' && (
          <>
            <div>
              <label>Find (Regex)</label>
              <STTextarea
                className="nodrag"
                rows={2}
                value={data.findRegex ?? ''}
                onChange={(e) => updateNodeData(id, { findRegex: e.target.value })}
              />
            </div>
            <div>
              <label>Replace</label>
              <STTextarea
                className="nodrag"
                rows={2}
                value={data.replaceString ?? ''}
                onChange={(e) => updateNodeData(id, { replaceString: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Matches (Array)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="matches"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};
