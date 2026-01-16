import { FC, useState, useEffect } from 'react';
import { STButton } from 'sillytavern-utils-lib/components/react';
import { PromptsSettings } from './PromptsSettings.js';
import { FlowchartEditor } from './FlowchartEditor.js';
import { FlowHistory } from './FlowHistory.js';
import { QrGroupSettings } from './QrGroupSettings.js';
import { eventEmitter } from '../../events.js';

type Tab = 'editor' | 'prompts' | 'history' | 'qr_groups';

interface FlowchartDataPopupProps {
  onSave: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const FlowchartDataPopup: FC<FlowchartDataPopupProps> = ({ onSave, isFullscreen, toggleFullscreen }) => {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
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
    <div className={`flowchart-data-popup ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="flowchart-popup-header">
        <div className="flowchart-popup-tabs">
          <STButton onClick={() => setActiveTab('editor')}>Editor</STButton>
          <STButton onClick={() => setActiveTab('prompts')}>Prompts</STButton>
          <STButton onClick={() => setActiveTab('history')}>History</STButton>
          <STButton onClick={() => setActiveTab('qr_groups')}>QR Groups</STButton>
        </div>
        <div className="flowchart-popup-controls">
          <STButton onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            <i className={`fa-solid fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
          </STButton>
        </div>
      </div>
      <div className="flowchart-popup-content">
        {activeTab === 'editor' && <FlowchartEditor key={`editor-${importKey}`} />}
        {activeTab === 'prompts' && <PromptsSettings key={`prompts-${importKey}`} />}
        {activeTab === 'history' && <FlowHistory />}
        {activeTab === 'qr_groups' && <QrGroupSettings />}
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
