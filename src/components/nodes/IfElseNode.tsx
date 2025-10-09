import React, { useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlow } from '../popup/FlowContext.js';
import { EventNameParameters } from '../../flow-types.js';
import { z } from 'zod';

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

export type IfElseNodeProps = {
  id: string;
  data: {
    code: string;
  };
};

export const IfElseNode: React.FC<IfElseNodeProps> = ({ id, data }) => {
  const { nodes, updateNodeData } = useFlow();

  const typeDeclarations = useMemo(() => {
    // Naively finds the first starter node. A real implementation would traverse the graph.
    const starterNode = nodes.find((n) => n.type === 'starterNode');
    if (!starterNode || !starterNode.data.selectedEventType) return '';

    const eventType = starterNode.data.selectedEventType as string;
    const eventSchema = EventNameParameters[eventType];
    return eventSchema ? zodSchemaToTypescript(eventSchema) : '';
  }, [nodes]);

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { code: value });
  };

  return (
    <div style={{ border: '1px solid #777', padding: '10px', background: '#333', width: 300, fontSize: '12px' }}>
      <Handle type="target" position={Position.Left} />
      <label style={{ display: 'block', marginBottom: '5px' }}>If Condition</label>
      <CodeMirror
        className="nodrag"
        value={data.code || ''}
        height="100px"
        extensions={[javascript({ typescript: true })]}
        width="100%"
        onChange={handleCodeChange}
        theme={'dark'}
        style={{ cursor: 'text' }}
      />
      {typeDeclarations && (
        <div style={{ marginTop: '5px', background: '#272822', padding: '5px', borderRadius: '3px' }}>
          <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold' }}>Available Input:</div>
          <pre style={{ fontSize: '10px', color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>{typeDeclarations}</pre>
        </div>
      )}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>True</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>False</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </div>
  );
};
