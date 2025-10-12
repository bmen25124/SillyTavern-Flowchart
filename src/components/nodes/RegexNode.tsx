import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RegexNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STSelect, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { shallow } from 'zustand/shallow';

export type RegexNodeProps = NodeProps<Node<RegexNodeData>>;

export const RegexNode: FC<RegexNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as RegexNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);

  useEffect(() => {
    const loadedRegexes = SillyTavern.getContext().extensionSettings.regex ?? [];
    setAllRegexes(loadedRegexes);
  }, []);

  const regexOptions = useMemo(() => allRegexes.map((r) => ({ value: r.id, label: r.scriptName })), [allRegexes]);

  if (!data) return null;

  const isStringConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'string');

  return (
    <BaseNode id={id} title="Regex" selected={selected}>
      <Handle type="target" position={Position.Left} id="string" style={{ top: '25%' }} />
      {isStringConnected && <label style={{ marginLeft: '10px' }}>Input String</label>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <STSelect
          className="nodrag"
          value={data.mode}
          onChange={(e) => updateNodeData(id, { mode: e.target.value as any })}
        >
          <option value="sillytavern">SillyTavern</option>
          <option value="custom">Custom</option>
        </STSelect>

        {data.mode === 'sillytavern' && (
          <div>
            <label>Regex Script</label>
            <STFancyDropdown
              value={[data.scriptId ?? '']}
              onChange={(e) => updateNodeData(id, { scriptId: e[0] })}
              multiple={false}
              items={regexOptions}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
            />
          </div>
        )}

        {data.mode === 'custom' && (
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
