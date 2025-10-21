import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { FieldConfig } from './fieldConfig.js';
import { NodeHandleRenderer } from './NodeHandleRenderer.js';
import { registrator } from './registrator.js';

export const DataDrivenNode: FC<NodeProps<Node<any>>> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data);
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const fields = useMemo(() => {
    if (!definition?.meta?.fields) return [];
    // This component now only supports static arrays or sync functions
    const fieldConfig = definition.meta.fields as FieldConfig[] | ((data: any) => FieldConfig[]);
    return typeof fieldConfig === 'function' ? fieldConfig(data) : fieldConfig;
  }, [definition, data]);

  if (!data || !definition) {
    return null;
  }

  return (
    <BaseNode id={id} title={definition.label} selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
        data={data}
        updateNodeData={updateNodeData}
      />
      <div className="node-output-section">
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
