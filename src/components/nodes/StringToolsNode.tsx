import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { StringToolsNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect, STButton } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';
import { STRING_TOOLS_MERGE_HANDLE_PREFIX } from '../../constants.js';

export type StringToolsNodeProps = NodeProps<Node<StringToolsNodeData>>;

export const StringToolsNode: FC<StringToolsNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as StringToolsNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const inputCount = data.inputCount ?? 2;
  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);
  const operation = data.operation ?? 'merge';

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  const renderInputs = () => {
    switch (operation) {
      case 'merge':
        return (
          <>
            {Array.from({ length: inputCount }, (_, i) => (
              <div
                key={`input_${i}`}
                style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${STRING_TOOLS_MERGE_HANDLE_PREFIX}${i}`}
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                <label style={{ marginLeft: '10px' }}>String {i + 1}</label>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <STButton onClick={() => setInputCount(inputCount + 1)}>+</STButton>
              <STButton onClick={() => setInputCount(inputCount - 1)} disabled={inputCount <= 1}>
                -
              </STButton>
            </div>
          </>
        );
      case 'split':
        return (
          <div style={{ position: 'relative' }}>
            <Handle type="target" position={Position.Left} id="string" />
            <label style={{ marginLeft: '10px' }}>String to Split</label>
          </div>
        );
      case 'join':
        return (
          <div style={{ position: 'relative' }}>
            <Handle type="target" position={Position.Left} id="array" />
            <label style={{ marginLeft: '10px' }}>Array to Join</label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <BaseNode id={id} title="String Tools" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="operation"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Operation</label>
          {!isConnected('operation') && (
            <STSelect
              className="nodrag"
              value={operation}
              onChange={(e) => updateNodeData(id, { operation: e.target.value as any })}
            >
              <option value="merge">Merge</option>
              <option value="split">Split</option>
              <option value="join">Join</option>
            </STSelect>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <Handle type="target" position={Position.Left} id="delimiter" />
          <label style={{ marginLeft: '10px' }}>Delimiter</label>
          {!isConnected('delimiter') && (
            <STInput
              className="nodrag"
              value={data.delimiter ?? ''}
              onChange={(e) => updateNodeData(id, { delimiter: e.target.value })}
            />
          )}
        </div>
        <hr />
        {renderInputs()}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};
