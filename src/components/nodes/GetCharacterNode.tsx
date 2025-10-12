import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetCharacterNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type GetCharacterNodeProps = NodeProps<Node<GetCharacterNodeData>>;

const fields = ['name', 'description', 'first_mes', 'scenario', 'personality', 'mes_example', 'tags'] as const;

export const GetCharacterNode: FC<GetCharacterNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isAvatarConnected = useIsConnected(id, 'characterAvatar');
  const { characters } = SillyTavern.getContext();

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Character" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="characterAvatar"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Character</label>
          {!isAvatarConnected && (
            <STFancyDropdown
              value={[data.characterAvatar ?? '']}
              onChange={(e) => updateNodeData(id, { characterAvatar: e[0] })}
              multiple={false}
              items={characters.map((c: any) => ({ value: c.avatar, label: c.name }))}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
            />
          )}
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span>Result (Full Object)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        {fields.map((field) => (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          >
            <span style={{ textTransform: 'capitalize' }}>{field.replace('_', ' ')}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};
