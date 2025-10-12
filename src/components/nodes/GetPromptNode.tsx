import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetPromptNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../config.js';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type GetPromptNodeProps = NodeProps<Node<GetPromptNodeData>>;

export const GetPromptNode: FC<GetPromptNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetPromptNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isPromptNameConnected = useIsConnected(id, 'promptName');

  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Prompt" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="promptName"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Prompt Name</label>
        {!isPromptNameConnected && (
          <STFancyDropdown
            value={[data.promptName ?? '']}
            onChange={(e) => updateNodeData(id, { promptName: e[0] })}
            multiple={false}
            items={promptOptions}
            inputClasses="nodrag"
            containerClasses="nodrag"
            closeOnSelect={true}
            enableSearch={true}
          />
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};
