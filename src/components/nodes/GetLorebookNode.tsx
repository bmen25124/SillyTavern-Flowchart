import { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetLorebookNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type GetLorebookNodeProps = NodeProps<Node<GetLorebookNodeData>>;

export const GetLorebookNode: FC<GetLorebookNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetLorebookNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isWorldNameConnected = useIsConnected(id, 'worldName');
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);

  useEffect(() => {
    getWorldInfos(['all']).then((worlds) => {
      setLorebookNames(Object.keys(worlds));
    });
  }, []);

  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Lorebook" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="worldName"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Lorebook Name</label>
        {!isWorldNameConnected && (
          <STFancyDropdown
            value={[data.worldName ?? '']}
            onChange={(e) => updateNodeData(id, { worldName: e[0] })}
            multiple={false}
            items={lorebookOptions}
            inputClasses="nodrag"
            containerClasses="nodrag"
            closeOnSelect={true}
            enableSearch={true}
          />
        )}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Entries (Array)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="entries"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};
