import { FC, useState, useEffect } from 'react';
import { STButton } from 'sillytavern-utils-lib/components';
import { PromptsSettings } from './PromptsSettings.js';
import { FlowChartGround } from './FlowChartGround.js';
import { FlowHistory } from './FlowHistory.js';
import { eventEmitter } from '../../events.js';

type Tab = 'prompts' | 'ground' | 'history';

interface FlowChartDataPopupProps {
  onSave: () => void;
}

export const FlowChartDataPopup: FC<FlowChartDataPopupProps> = ({ onSave }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ground');
  const [importKey, setImportKey] = useState(0);

  useEffect(() => {
    // This allows the main settings panel to force-refresh this popup's content
    // if a full settings reset happens while this popup is open.
    const listener = () => setImportKey((k) => k + 1);
    eventEmitter.on('flow:reset-all-settings', listener);
    return () => {
      eventEmitter.off('flow:reset-all-settings', listener);
    };
  }, []);

  const handleClose = () => {
    onSave(); // This prop is actually `closePopup`
  };

  return (
    <div className="flowchart-data-popup">
      <div className="flowchart-popup-header">
        <div className="flowchart-popup-tabs">
          <STButton onClick={() => setActiveTab('ground')}>Ground</STButton>
          <STButton onClick={() => setActiveTab('prompts')}>Prompts</STButton>
          <STButton onClick={() => setActiveTab('history')}>History</STButton>
        </div>
      </div>
      <div className="flowchart-popup-content">
        {activeTab === 'ground' && <FlowChartGround key={`ground-${importKey}`} />}
        {activeTab === 'prompts' && <PromptsSettings key={`prompts-${importKey}`} />}
        {activeTab === 'history' && <FlowHistory />}
      </div>
      <div className="flowchart-popup-footer">
        <div style={{ flex: 1 }} />
        <STButton onClick={handleClose} color="primary">
          Close
        </STButton>
      </div>
    </div>
  );
};
