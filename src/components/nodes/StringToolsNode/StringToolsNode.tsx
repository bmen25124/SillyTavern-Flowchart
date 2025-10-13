import { FC, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { StringToolsNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect, STButton } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type StringToolsNodeProps = NodeProps<Node<StringToolsNodeData>>;

const fields = [
  createFieldConfig({
    id: 'operation',
    label: 'Operation',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="merge">Merge</option>
          <option value="split">Split</option>
          <option value="join">Join</option>
        </>
      ),
    },
  }),
  createFieldConfig({
    id: 'delimiter',
    label: 'Delimiter',
    component: STInput,
    props: { type: 'text' },
  }),
];

export const StringToolsNode: FC<StringToolsNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as StringToolsNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const edges = useFlowStore((state) => state.edges);
  const setEdges = useFlowStore((state) => state.setEdges);

  const definition = registrator.nodeDefinitionMap.get('stringToolsNode')!;
  const inputCount = data?.inputCount ?? 2;
  const operation = data?.operation ?? 'merge';

  useEffect(() => {
    const currentHandles = new Set<string>();
    if (operation === 'merge') {
      for (let i = 0; i < inputCount; i++) {
        currentHandles.add(definition.getDynamicHandleId!(i));
      }
    } else if (operation === 'split') {
      currentHandles.add('string');
    } else if (operation === 'join') {
      currentHandles.add('array');
    }

    const filteredEdges = edges.filter(
      (edge) => !(edge.target === id && edge.targetHandle && !currentHandles.has(edge.targetHandle)),
    );

    if (filteredEdges.length < edges.length) {
      setEdges(filteredEdges);
    }
  }, [operation, inputCount, id, setEdges, edges, definition]);

  if (!data) return null;

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
                  id={definition.getDynamicHandleId!(i)}
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
        <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
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
