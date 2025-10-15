import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';
import { HttpRequestNodeData } from './definition.js';

export type HttpRequestNodeProps = NodeProps<Node<HttpRequestNodeData>>;

export const HttpRequestNode: FC<HttpRequestNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as HttpRequestNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const fields = useMemo(
    () => [
      createFieldConfig({ id: 'url', label: 'URL', component: STInput, props: { type: 'text' } }),
      createFieldConfig({
        id: 'method',
        label: 'Method',
        component: STSelect,
        props: {
          children: (
            <>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </>
          ),
        },
      }),
      createFieldConfig({
        id: 'headers',
        label: 'Headers (JSON)',
        component: CodeMirror,
        props: {
          height: '100px',
          extensions: [javascript({})],
          theme: 'dark',
          style: { cursor: 'text', marginTop: '5px' },
        },
        customChangeHandler: (value: string) => updateNodeData(id, { headers: value }),
      }),
      createFieldConfig({
        id: 'body',
        label: 'Body (JSON)',
        component: CodeMirror,
        props: {
          height: '100px',
          extensions: [javascript({})],
          theme: 'dark',
          style: { cursor: 'text', marginTop: '5px' },
        },
        customChangeHandler: (value: string) => updateNodeData(id, { body: value }),
      }),
    ],
    [updateNodeData, id],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="HTTP Request" selected={selected}>
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
