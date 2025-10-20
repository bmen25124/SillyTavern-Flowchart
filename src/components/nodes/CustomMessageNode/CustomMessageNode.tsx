import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CustomMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STButton, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { generateUUID } from '../../../utils/uuid.js';
import { useIsConnected } from '../../../hooks/useIsConnected.js';

export type CustomMessageNodeProps = NodeProps<Node<CustomMessageNodeData>>;

export const CustomMessageNode: FC<CustomMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CustomMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  const handleMessageChange = (
    msgId: string,
    field: 'role' | 'content',
    value: 'system' | 'user' | 'assistant' | string,
  ) => {
    const newMessages = data.messages.map((msg) => (msg.id === msgId ? { ...msg, [field]: value } : msg));
    updateNodeData(id, { messages: newMessages });
  };

  const addMessage = () => {
    const newMessage = { id: generateUUID(), role: 'user' as const, content: '' };
    updateNodeData(id, { messages: [...(data.messages || []), newMessage] });
  };

  const removeMessage = (msgId: string) => {
    const newMessages = data.messages.filter((msg) => msg.id !== msgId);
    updateNodeData(id, { messages: newMessages });
  };

  return (
    <BaseNode id={id} title="Custom Messages" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(data.messages || []).map((msg) => {
          const connectedRole = useIsConnected(id, `${msg.id}_role`);
          const connectedContent = useIsConnected(id, msg.id);

          return (
            <div key={msg.id} style={{ border: '1px solid #555', padding: '5px', borderRadius: '4px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}
              >
                <div style={{ position: 'relative', flex: 1, marginRight: '10px' }}>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${msg.id}_role`}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />
                  {!connectedRole ? (
                    <STSelect
                      className="nodrag"
                      value={msg.role}
                      onChange={(e) =>
                        handleMessageChange(msg.id, 'role', e.target.value as 'system' | 'user' | 'assistant')
                      }
                    >
                      <option value="system">system</option>
                      <option value="user">user</option>
                      <option value="assistant">assistant</option>
                    </STSelect>
                  ) : (
                    <span style={{ marginLeft: '10px', fontSize: '10px', color: '#888' }}>Role from connection</span>
                  )}
                </div>
                <STButton onClick={() => removeMessage(msg.id)}>Remove</STButton>
              </div>
              <div style={{ position: 'relative' }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={msg.id}
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                {!connectedContent ? (
                  <STTextarea
                    className="nodrag"
                    value={msg.content}
                    onChange={(e) => handleMessageChange(msg.id, 'content', e.target.value)}
                    rows={3}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <span style={{ fontSize: '10px', color: '#888' }}>Content from connection</span>
                )}
              </div>
            </div>
          );
        })}
        <STButton className="nodrag" onClick={addMessage} style={{ marginTop: '5px' }}>
          Add Message
        </STButton>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
