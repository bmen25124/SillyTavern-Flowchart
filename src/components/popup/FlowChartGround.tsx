import { FC, useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { FlowProvider, useFlow } from './FlowContext.js';
import { StarterNode } from '../nodes/StarterNode.js';
import { IfNode } from '../nodes/IfNode.js';
import { CreateMessagesNode } from '../nodes/CreateMessagesNode.js';
import { StringNode } from '../nodes/StringNode.js';
import { NumberNode } from '../nodes/NumberNode.js';
import { StructuredRequestNode } from '../nodes/StructuredRequestNode.js';
import { SchemaNode } from '../nodes/SchemaNode.js';
import { ProfileIdNode } from '../nodes/ProfileIdNode.js';
import { settingsManager } from '../Settings.js';
import { STPresetSelect, STButton } from 'sillytavern-utils-lib/components';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import type { PresetItem } from 'sillytavern-utils-lib/components';
import { NodePalette } from './NodePalette.js';
import { flowRunner } from '../../FlowRunner.js';

const FlowCanvas: FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlow();

  const nodeTypes = useMemo(
    () => ({
      starterNode: StarterNode,
      ifNode: IfNode,
      createMessagesNode: CreateMessagesNode,
      stringNode: StringNode,
      numberNode: NumberNode,
      structuredRequestNode: StructuredRequestNode,
      schemaNode: SchemaNode,
      profileIdNode: ProfileIdNode,
    }),
    [],
  );

  return (
    <div className="flowchart-popup-ground">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const FlowManager: FC = () => {
  const { loadFlow, getFlowData } = useFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const { Popup } = SillyTavern.getContext();

  const presetItems = useMemo(
    () => Object.keys(settings.flows).map((key) => ({ value: key, label: key })),
    [settings.flows],
  );

  const handleSave = () => {
    const currentFlowData = getFlowData();
    settings.flows[settings.activeFlow] = structuredClone(currentFlowData);
    settingsManager.saveSettings();
    flowRunner.reinitialize();
  };

  const handleSelectChange = (newValue?: string) => {
    if (newValue && settings.flows[newValue]) {
      settings.activeFlow = newValue;
      loadFlow(structuredClone(settings.flows[newValue]));
      forceUpdate();
    }
  };

  const handleItemsChange = (newItems: PresetItem[]) => {
    const newFlows: Record<string, any> = {};
    let activeFlowExists = false;

    for (const item of newItems) {
      newFlows[item.value] = settings.flows[item.value] || { nodes: [], edges: [] };
      if (item.value === settings.activeFlow) {
        activeFlowExists = true;
      }
    }
    settings.flows = newFlows;

    if (!activeFlowExists) {
      settings.activeFlow = newItems[0]?.value || '';
      if (settings.activeFlow) {
        loadFlow(structuredClone(settings.flows[settings.activeFlow]));
      } else {
        loadFlow({ nodes: [], edges: [] });
      }
    }
    forceUpdate();
    flowRunner.reinitialize();
  };

  const handleCreate = (newValue: string) => {
    if (settings.flows[newValue]) {
      st_echo('error', `A flow named "${newValue}" already exists.`);
      return { confirmed: false };
    }
    return { confirmed: true, value: newValue };
  };

  const handleRename = (oldValue: string, newValue: string) => {
    if (settings.flows[newValue]) {
      st_echo('error', `A flow named "${newValue}" already exists.`);
      return { confirmed: false };
    }
    settings.flows[newValue] = settings.flows[oldValue];
    delete settings.flows[oldValue];
    if (settings.activeFlow === oldValue) {
      settings.activeFlow = newValue;
    }
    flowRunner.reinitialize();
    forceUpdate();
    return { confirmed: true };
  };

  return (
    <div className="flowchart-ground-manager">
      <div className="flowchart-preset-selector">
        <STPresetSelect
          label="Flow"
          value={settings.activeFlow}
          items={presetItems}
          onChange={handleSelectChange}
          onItemsChange={handleItemsChange}
          onCreate={handleCreate}
          onRename={handleRename}
          enableCreate
          enableRename
          enableDelete
        />
        <STButton onClick={handleSave}>Save Flow</STButton>
      </div>
      <div className="flowchart-editor-area">
        <NodePalette />
        <FlowCanvas />
      </div>
    </div>
  );
};

export const FlowChartGround: FC = () => {
  return (
    <FlowProvider>
      <FlowManager />
    </FlowProvider>
  );
};
