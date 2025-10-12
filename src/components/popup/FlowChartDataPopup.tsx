import { FC, useState } from 'react';
import { STButton } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../Settings.js';
import { PromptsSettings } from './PromptsSettings.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { DEFAULT_SETTINGS } from '../../config.js';
import { FlowChartGround } from './FlowChartGround.js';
import { FlowHistory } from './FlowHistory.js';
import { DebugPanel } from './DebugPanel.js';

type Tab = 'prompts' | 'ground' | 'history' | 'debug';

interface FlowChartDataPopupProps {
  onSave: () => void;
}

export const FlowChartDataPopup: FC<FlowChartDataPopupProps> = ({ onSave }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ground');
  const [importKey, setImportKey] = useState(0);
  const { Popup } = SillyTavern.getContext();

  const handleSave = () => {
    settingsManager.saveSettings();
    onSave();
  };

  const handleResetAll = async () => {
    const confirmation = await Popup.show.confirm(
      'Reset FlowChart Data',
      'Are you sure you want to reset ALL prompts and flows to their defaults? This action cannot be undone.',
    );

    if (confirmation) {
      const settings = settingsManager.getSettings();

      // Deep clone from defaultSettings to avoid reference issues
      settings.prompts = structuredClone(DEFAULT_SETTINGS.prompts);
      settings.flows = structuredClone(DEFAULT_SETTINGS.flows);
      settings.activeFlow = 'Default';

      // Force a re-render of all child components by changing the key
      setImportKey((k) => k + 1);

      st_echo('info', 'All FlowChart prompts and data have been reset to default.');
    }
  };

  return (
    <div className="flowchart-data-popup">
      <div className="flowchart-popup-header">
        <div className="flowchart-popup-tabs">
          <STButton onClick={() => setActiveTab('ground')}>Ground</STButton>
          <STButton onClick={() => setActiveTab('prompts')}>Prompts</STButton>
          <STButton onClick={() => setActiveTab('history')}>History</STButton>
          <STButton onClick={() => setActiveTab('debug')}>Debug</STButton>
        </div>
      </div>
      <div className="flowchart-popup-content">
        {activeTab === 'ground' && <FlowChartGround key={`ground-${importKey}`} />}
        {activeTab === 'prompts' && <PromptsSettings key={`prompts-${importKey}`} />}
        {activeTab === 'history' && <FlowHistory />}
        {activeTab === 'debug' && <DebugPanel />}
      </div>
      <div className="flowchart-popup-footer">
        <STButton onClick={handleResetAll} color="danger">
          Reset All to Default
        </STButton>
        <div style={{ flex: 1 }} />
        <STButton onClick={handleSave} color="primary">
          Save and Close
        </STButton>
      </div>
    </div>
  );
};
