import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { QuickReplyTriggerNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components/react';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type QuickReplyTriggerNodeProps = NodeProps<Node<QuickReplyTriggerNodeData>>;

export const QuickReplyTriggerNode: FC<QuickReplyTriggerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as QuickReplyTriggerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="QR Button Trigger" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label>Button Text</label>
          <STInput
            className="nodrag"
            value={data.buttonText}
            onChange={(e) => updateNodeData(id, { buttonText: e.target.value })}
          />
        </div>
        <div>
          <label>Font Awesome Icon</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <STInput
              className="nodrag"
              value={data.icon}
              onChange={(e) => updateNodeData(id, { icon: e.target.value })}
              style={{ flex: 1 }}
            />
            <div
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--SmartThemeBorderColor)',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              <i key={data.icon} className={data.icon} style={{ fontSize: '16px' }}></i>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#ccc', margin: '4px 0 0 0' }}>
            Find icons on{' '}
            <a
              href="https://fontawesome.com/v6/search?f=classic&s=solid&ic=free&o=r"
              target="_blank"
              rel="noopener noreferrer"
            >
              Font Awesome
            </a>
            . Use the full class name.
          </p>
        </div>
        <div>
          <label>Group Name</label>
          <STInput
            className="nodrag"
            value={data.group}
            onChange={(e) => updateNodeData(id, { group: e.target.value })}
          />
        </div>
        <div>
          <label>Order (within group)</label>
          <STInput
            className="nodrag"
            type="number"
            value={data.order}
            onChange={(e) => updateNodeData(id, { order: Number(e.target.value) })}
          />
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
