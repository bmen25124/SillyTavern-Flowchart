import { FC } from 'react';
import type { ChangeEvent } from 'react';
import { STButton, STInput, STPresetSelect, PresetItem, PresetButtonDef } from 'sillytavern-utils-lib/components/react';

type PresetEditResult = { confirmed: boolean; value?: PresetItem };

type FlowToolbarProps = {
  flowItems: PresetItem[];
  activeFlowId: string;
  presetButtons: PresetButtonDef[];
  onSelectFlow: (flowId?: string) => void;
  onItemsChange: (items: PresetItem[]) => void;
  onCreateFlow: (newName: string) => PresetEditResult;
  onRenameFlow: (flowId: string, newName: string) => PresetEditResult;
  onDeleteFlow: (flowId: string) => boolean;
  isFlowEnabled: boolean;
  onToggleFlowEnabled: (event: ChangeEvent<HTMLInputElement>) => void;
  isDangerousAllowed: boolean;
  onToggleDangerous: (event: ChangeEvent<HTMLInputElement>) => void;
  runId: string | null;
  isVisualizationVisible: boolean;
  onToggleVisualization: () => void;
  onClearRun: () => void;
  isValid: boolean;
  errors: string[];
  runStatus: 'idle' | 'running' | string;
  onRunFlow: () => void;
  onStopFlow: () => void;
};

export const FlowToolbar: FC<FlowToolbarProps> = ({
  flowItems,
  activeFlowId,
  presetButtons,
  onSelectFlow,
  onItemsChange,
  onCreateFlow,
  onRenameFlow,
  onDeleteFlow,
  isFlowEnabled,
  onToggleFlowEnabled,
  isDangerousAllowed,
  onToggleDangerous,
  runId,
  isVisualizationVisible,
  onToggleVisualization,
  onClearRun,
  isValid,
  errors,
  runStatus,
  onRunFlow,
  onStopFlow,
}) => (
  <div className="flowchart-preset-selector" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <STPresetSelect
      label="Flow"
      items={flowItems}
      value={activeFlowId}
      onChange={onSelectFlow}
      onItemsChange={onItemsChange}
      onCreate={onCreateFlow}
      onRename={onRenameFlow}
      onDelete={onDeleteFlow}
      enableCreate
      enableRename
      enableDelete
      buttons={presetButtons}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <STInput
        type="checkbox"
        id="flow-enabled-toggle"
        checked={isFlowEnabled}
        onChange={onToggleFlowEnabled}
        title="Enable or disable this flow from running automatically."
      />
      <label htmlFor="flow-enabled-toggle">Enabled</label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <STInput
        type="checkbox"
        id="flow-dangerous-permission-toggle"
        checked={isDangerousAllowed}
        onChange={onToggleDangerous}
        title="Allow this flow to execute dangerous nodes like Execute JS or HTTP Request. This can be a security risk."
      />
      <label htmlFor="flow-dangerous-permission-toggle">Allow Dangerous</label>
    </div>
    <div style={{ flex: 1 }}></div>
    {runId && (
      <>
        <STButton onClick={onToggleVisualization}>
          {isVisualizationVisible ? 'Hide Last Run' : 'Show Last Run'}
        </STButton>
        <STButton color="secondary" onClick={onClearRun}>
          Clear Run
        </STButton>
      </>
    )}
    {!isValid && (
      <STButton color="warning" title={errors.join('\n')}>
        Invalid ({errors.length})
      </STButton>
    )}
    {runStatus === 'running' ? (
      <STButton color="danger" onClick={onStopFlow}>
        <i className="fa-solid fa-stop"></i> Stop
      </STButton>
    ) : (
      <STButton
        color="primary"
        onClick={onRunFlow}
        title="Run the flow starting from Manual Triggers, or from the beginning if none exist."
      >
        <i className="fa-solid fa-play"></i> Run
      </STButton>
    )}
  </div>
);
