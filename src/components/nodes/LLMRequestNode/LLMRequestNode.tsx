import React, { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { LLMRequestNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect, STFancyDropdown, STInput, STSelect } from 'sillytavern-utils-lib/components/react';
import { PromptEngineeringMode, settingsManager } from '../../../config.js';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type LLMRequestNodeProps = NodeProps<Node<LLMRequestNodeData>>;

export const LLMRequestNode: FC<LLMRequestNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as LLMRequestNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const isSchemaConnected = useIsConnected(id, 'schema');
  const { flows, activeFlow } = settingsManager.getSettings();

  const streamFlowOptions = useMemo(
    () =>
      Object.values(flows)
        .filter((flow) => {
          if (flow.id === activeFlow) return false;

          return flow.flow.nodes.some(
            (node) =>
              (node.type === 'onStreamTriggerNode' || node.type === 'manualTriggerNode') &&
              !flow.flow.edges.some((edge) => edge.target === node.id),
          );
        })
        .map(({ id, name }) => ({ value: id, label: name })),
    [flows, activeFlow],
  );

  const fields = useMemo(() => {
    const config = [
      createFieldConfig({
        id: 'profileId',
        label: 'Connection Profile',
        component: STConnectionProfileSelect,
        props: { initialSelectedProfileId: data?.profileId },
        customChangeHandler: (profile?: ConnectionProfile) => {
          updateNodeData(id, { profileId: profile?.id || '' });
        },
      }),
      createFieldConfig({
        id: 'maxResponseToken',
        label: 'Max Response Tokens',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
      }),
    ];

    if (!isSchemaConnected) {
      config.push(
        createFieldConfig({
          id: 'stream',
          label: 'Stream Response',
          component: STInput,
          props: { type: 'checkbox' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
        }),
      );

      if (data?.stream) {
        config.push(
          createFieldConfig({
            id: 'onStreamFlowId',
            label: 'On Stream Flow',
            component: STFancyDropdown,
            props: {
              items: streamFlowOptions,
              multiple: false,
              inputClasses: 'nodrag',
              containerClasses: 'nodrag nowheel',
              closeOnSelect: true,
              enableSearch: true,
            },
            getValueFromEvent: (e: string[]) => e[0],
            formatValue: (value) => [value ?? ''],
          }),
        );
      }
    }

    // These fields are only relevant (and their handles only exist) when a schema is connected.
    if (isSchemaConnected) {
      config.push(
        createFieldConfig({
          id: 'schemaName',
          label: 'Schema Name',
          component: STInput,
          props: { type: 'text' },
        }),
        createFieldConfig({
          id: 'promptEngineeringMode',
          label: 'Prompt Engineering Mode',
          component: STSelect,
          props: {
            children: Object.values(PromptEngineeringMode).map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            )),
          },
        }),
      );
    }
    return config;
  }, [isSchemaConnected, data?.profileId, data?.stream, id, streamFlowOptions, updateNodeData]);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="LLM Request" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
        data={data}
        updateNodeData={updateNodeData}
      />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
