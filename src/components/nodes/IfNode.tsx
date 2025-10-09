import React, { useMemo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlow } from '../popup/FlowContext.js';
import { EventNameParameters, IfNodeData } from '../../flow-types.js';
import { z } from 'zod';
import { STButton } from 'sillytavern-utils-lib/components';
import { BaseNode } from './BaseNode.js';

function zodSchemaToTypescript(schema: Record<string, z.ZodType>): string {
  let interfaceString = '{\n';
  for (const key in schema) {
    const zodType = schema[key].def.type;
    let tsType = 'any';
    if (zodType === 'number') tsType = 'number';
    else if (zodType === 'string') tsType = 'string';
    else if (zodType === 'boolean') tsType = 'boolean';
    interfaceString += `  ${key}: ${tsType};\n`;
  }
  interfaceString += '}';
  return `const input: ${interfaceString}`;
}

export type IfNodeProps = NodeProps<Node<IfNodeData>>;

export const IfNode: React.FC<IfNodeProps> = ({ id, data, selected }) => {
  const { nodes, edges, updateNodeData } = useFlow();

  const typeDeclarations = useMemo(() => {
    const findTriggerNode = (startNodeId: string): Node | undefined => {
      const queue: string[] = [startNodeId];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        if (visited.has(currentNodeId)) {
          continue;
        }
        visited.add(currentNodeId);

        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (currentNode?.type === 'triggerNode') {
          return currentNode;
        }

        const incomingEdges = edges.filter((e) => e.target === currentNodeId);
        for (const edge of incomingEdges) {
          queue.push(edge.source);
        }
      }
      return undefined;
    };

    const triggerNode = findTriggerNode(id);
    if (!triggerNode || !triggerNode.data.selectedEventType) return '';

    const eventType = triggerNode.data.selectedEventType as string;
    const eventSchema = EventNameParameters[eventType];
    return eventSchema ? zodSchemaToTypescript(eventSchema) : '';
  }, [id, nodes, edges]);

  const handleCodeChange = (conditionId: string, value: string) => {
    const newConditions = data.conditions.map((c) => (c.id === conditionId ? { ...c, code: value } : c));
    updateNodeData(id, { conditions: newConditions });
  };

  const addCondition = () => {
    const newCondition = { id: crypto.randomUUID(), code: 'return true;' };
    updateNodeData(id, { conditions: [...data.conditions, newCondition] });
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = data.conditions.filter((c) => c.id !== conditionId);
    updateNodeData(id, { conditions: newConditions });
  };

  return (
    <BaseNode id={id} title="If Conditions" selected={selected}>
      <div>
        {data.conditions.map((condition, index) => (
          <div key={condition.id} style={{ marginBottom: '10px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}
            >
              <span>Condition {index + 1}</span>
              {data.conditions.length > 1 && <STButton onClick={() => removeCondition(condition.id)}>Remove</STButton>}
            </div>
            <CodeMirror
              className="nodrag"
              value={condition.code || ''}
              height="100px"
              extensions={[javascript({ typescript: true })]}
              width="100%"
              onChange={(value) => handleCodeChange(condition.id, value)}
              theme={'dark'}
              style={{ cursor: 'text' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '5px' }}>
              <span>True</span>
              <Handle
                type="source"
                position={Position.Right}
                id={condition.id}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
            </div>
          </div>
        ))}
        <STButton onClick={addCondition} style={{ marginTop: '10px' }}>
          Add Else If
        </STButton>

        {typeDeclarations && (
          <div style={{ marginTop: '5px', background: '#272822', padding: '5px', borderRadius: '3px' }}>
            <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold' }}>Available Input:</div>
            <pre style={{ fontSize: '10px', color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>{typeDeclarations}</pre>
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            <span>Else</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
