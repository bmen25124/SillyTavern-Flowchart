import { FC, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeDefinition, HandleSpec } from './definitions/types.js';
import { FlowDataTypeColors } from '../../flow-types.js';
import { schemaToText } from '../../utils/schema-inspector.js';
import { useFlowStore } from '../popup/flowStore.js';
import { useConnectedHandles } from '../../hooks/useConnectedHandles.js';
import { FieldConfig } from './fieldConfig.js';
import React from 'react';

interface NodeHandleRendererProps {
  nodeId: string;
  definition: NodeDefinition;
  type: 'input' | 'output';
  fields?: readonly FieldConfig[];
  data?: Record<string, any>;
  updateNodeData?: (id: string, data: object) => void;
}

export const NodeHandleRenderer: FC<NodeHandleRendererProps> = ({
  nodeId,
  definition,
  type,
  fields,
  data,
  updateNodeData,
}) => {
  const { node, allNodes, allEdges } = useFlowStore((state) => ({
    node: state.nodesMap.get(nodeId),
    allNodes: state.nodes,
    allEdges: state.edges,
  }));
  const connectedHandles = useConnectedHandles(nodeId);

  const handlesToRender = useMemo(() => {
    if (!node) return [];

    const staticHandles = type === 'input' ? definition.handles.inputs : definition.handles.outputs;
    let dynamicHandles: HandleSpec[] = [];

    if (definition.getDynamicHandles) {
      const result = definition.getDynamicHandles(node, allNodes, allEdges);
      dynamicHandles = type === 'input' ? result.inputs : result.outputs;
    }

    const staticFiltered = staticHandles.filter((sh) => !dynamicHandles.some((dh) => dh.id === sh.id));
    return [...staticFiltered, ...dynamicHandles].filter((handle) => handle.id);
  }, [node, allNodes, allEdges, definition, type]);

  const position = type === 'input' ? Position.Left : Position.Right;
  const justifyContent = type === 'input' ? 'flex-start' : 'flex-end';

  if (handlesToRender.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {handlesToRender.map((handle) => {
        const schemaTooltip = handle.schema ? schemaToText(handle.schema) : handle.type;
        const fieldConfig = type === 'input' && fields ? fields.find((f) => f.id === handle.id) : undefined;
        const isConnected = connectedHandles.has(handle.id!);
        const showStaticInput = fieldConfig && !isConnected;

        const handleComponent = (
          <Handle
            type={type === 'input' ? 'target' : 'source'}
            position={position}
            id={handle.id!}
            style={{
              position: 'relative',
              transform: 'none',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: FlowDataTypeColors[handle.type],
            }}
          />
        );

        let staticInputComponent = null;
        if (showStaticInput && data && updateNodeData) {
          const handleChange = (event: any) => {
            if (fieldConfig.customChangeHandler) {
              fieldConfig.customChangeHandler(event, { nodeId, updateNodeData });
            } else {
              const value = fieldConfig.getValueFromEvent ? fieldConfig.getValueFromEvent(event) : event.target.value;
              updateNodeData(nodeId, { [fieldConfig.id]: value });
            }
          };

          const componentProps: Record<string, any> = {
            className: 'nodrag',
            onChange: handleChange,
            ...fieldConfig.props,
          };

          if (fieldConfig.props?.type === 'checkbox') {
            componentProps.checked = data[fieldConfig.id] ?? false;
          } else {
            componentProps.value = fieldConfig.formatValue
              ? fieldConfig.formatValue(data[fieldConfig.id])
              : (data[fieldConfig.id] ?? '');
          }
          staticInputComponent = React.createElement(fieldConfig.component, componentProps);
        }

        const labelComponent = fieldConfig ? fieldConfig.label : handle.id;

        const labelAndType = (
          <>
            <label style={{ margin: '0 10px', textTransform: 'capitalize' }}>{labelComponent}</label>
            <span className="handle-label">({handle.type})</span>
          </>
        );

        return (
          <div key={handle.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent }} title={schemaTooltip}>
              {type === 'input' ? (
                <>
                  {handleComponent}
                  {labelAndType}
                </>
              ) : (
                <>
                  {labelAndType}
                  {handleComponent}
                </>
              )}
            </div>
            {staticInputComponent}
          </div>
        );
      })}
    </div>
  );
};
