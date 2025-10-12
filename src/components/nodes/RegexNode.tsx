import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RegexNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STSelect, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type RegexNodeProps = NodeProps<Node<RegexNodeData>>;

export const RegexNode: FC<RegexNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RegexNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isStringConnected = useIsConnected(id, 'string');
  const isModeConnected = useIsConnected(id, 'mode');
  const isScriptIdConnected = useIsConnected(id, 'scriptId');
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);

  useEffect(() => {
    const loadedRegexes = SillyTavern.getContext().extensionSettings.regex ?? [];
    setAllRegexes(loadedRegexes);
  }, []);

  const regexOptions = useMemo(() => allRegexes.map((r) => ({ value: r.id, label: r.scriptName })), [allRegexes]);

  if (!data) return null;

  const mode = data.mode ?? 'sillytavern';

  return (
    <BaseNode id={id} title="Regex" selected={selected}>
      <Handle type="target" position={Position.Left} id="string" style={{ top: '25%' }} />
      {isStringConnected && <label style={{ marginLeft: '10px' }}>Input String</label>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="mode"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Mode</label>
          {!isModeConnected && (
            <STSelect
              className="nodrag"
              value={mode}
              onChange={(e) => updateNodeData(id, { mode: e.target.value as any })}
            >
              <option value="sillytavern">SillyTavern</option>
              <option value="custom">Custom</option>
            </STSelect>
          )}
        </div>

        {mode === 'sillytavern' && (
          <div style={{ position: 'relative' }}>
            <Handle
              type="target"
              position={Position.Left}
              id="scriptId"
              style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
            />
            <label style={{ marginLeft: '10px' }}>Regex Script</label>
            {!isScriptIdConnected && (
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
            )}
          </div>
        )}

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
