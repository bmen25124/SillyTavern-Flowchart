import { FC } from 'react';
import { NodeProps, Node, useEdges } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { ExecuteJsNodeData } from './definition.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { z } from 'zod';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

function getZodTypeName(schema: z.ZodType): string {
  const typeName = (schema._def as any).typeName;
  if (typeName) {
    return typeName.replace('Zod', '').toLowerCase();
  }
  return 'unknown';
}

export type ExecuteJsNodeProps = NodeProps<Node<ExecuteJsNodeData>>;

export const ExecuteJsNode: FC<ExecuteJsNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ExecuteJsNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  useEdges();
  const inputSchema = useInputSchema(id, 'scriptInput');

  const isInputAnObject = inputSchema instanceof z.ZodObject;

  if (!data || !definition) return null;

  const handleCodeChange = (value: string) => {
    updateNodeData(id, { code: value });
  };

  return (
    <BaseNode id={id} title="Execute JS Code" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
        <div>
          <label>Code (`input`, `variables`, and `stContext` are available)</label>
          {inputSchema && (
            <div style={{ fontSize: '10px', color: '#aaa', margin: '5px 0' }}>
              {isInputAnObject ? (
                <>
                  <b>Available properties in `input`:</b>
                  <pre
                    style={{
                      margin: '2px 0 0 0',
                      background: '#2a2a2a',
                      padding: '4px',
                      borderRadius: '3px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {schemaToText(inputSchema)}
                  </pre>
                </>
              ) : (
                <>
                  <b>`input` variable will be a:</b>
                  <pre style={{ margin: '2px 0 0 0', background: '#2a2a2a', padding: '4px', borderRadius: '3px' }}>
                    {getZodTypeName(inputSchema)}
                  </pre>
                </>
              )}
            </div>
          )}
          <CodeMirror
            className="nodrag"
            value={data.code || ''}
            height="150px"
            extensions={[javascript({})]}
            width="100%"
            onChange={handleCodeChange}
            theme={'dark'}
            style={{ cursor: 'text' }}
          />
        </div>
        <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};
