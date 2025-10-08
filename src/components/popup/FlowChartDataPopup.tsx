import { FC, useState } from 'react';
import { STButton } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../Settings.js';
import { PromptsSettings } from './PromptsSettings.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { DEFAULT_SETTINGS } from '../../config.js';
import { FlowChartGround } from './FlowChartGround.js';

type Tab = 'prompts' | 'ground';

interface FlowChartDataPopupProps {
  onSave: () => void;
}

export const FlowChartDataPopup: FC<FlowChartDataPopupProps> = ({ onSave }) => {
  const [activeTab, setActiveTab] = useState<Tab>('prompts');
  const [importKey, setImportKey] = useState(0);
  const { Popup } = SillyTavern.getContext();

  const handleSave = () => {
    settingsManager.saveSettings();
    onSave();
  };

  const handleResetAll = async () => {
    const confirmation = await Popup.show.confirm(
      'Reset FlowChart Data',
      'Are you sure you want to reset ALL prompts, the Fate Chart, Event Generation, and UNE data to their defaults? This action cannot be undone.',
    );

    if (confirmation) {
      const settings = settingsManager.getSettings();

      // Deep clone from defaultSettings to avoid reference issues
      settings.prompts = structuredClone(DEFAULT_SETTINGS.prompts);

      // Force a re-render of all child components by changing the key
      setImportKey((k) => k + 1);

      st_echo('info', 'All FlowChart prompts and data have been reset to default.');
    }
  };

  return (
    <div className="flowchart-data-popup">
      <div className="flowchart-popup-header">
        <h2>Customize FlowChart Data</h2>
        <div className="flowchart-popup-tabs">
          <STButton onClick={() => setActiveTab('prompts')}>Prompts</STButton>
        </div>
      </div>
      <div className="flowchart-popup-content">
        {activeTab === 'prompts' && <PromptsSettings key={`prompts-${importKey}`} />}
        {activeTab === 'ground' && <FlowChartGround key={`ground-${importKey}`} />}
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
