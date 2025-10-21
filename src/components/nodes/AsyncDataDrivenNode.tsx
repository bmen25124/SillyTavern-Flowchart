import { FC, useState, useEffect } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { FieldConfig } from './fieldConfig.js';
import { NodeHandleRenderer } from './NodeHandleRenderer.js';
import { registrator } from './registrator.js';

export const AsyncDataDrivenNode: FC<NodeProps<Node<any>>> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data);
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const [fields, setFields] = useState<FieldConfig[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fieldsConfig = definition?.meta?.fields;
    if (typeof fieldsConfig === 'function') {
      const result = fieldsConfig(data);
      if (result instanceof Promise) {
        result.then((resolvedFields) => {
          if (isMounted) setFields(resolvedFields);
        });
      } else {
        // Handle case where it's a sync function
        setFields(result);
      }
    } else if (Array.isArray(fieldsConfig)) {
      // Handle static array case
      setFields(fieldsConfig);
    }

    return () => {
      isMounted = false;
    };
  }, [definition, data]);

  if (!data || !definition) return null;

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
