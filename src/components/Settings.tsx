import { FC, useCallback } from 'react';
import { STButton, STInput } from 'sillytavern-utils-lib/components';
import { ExtensionSettings, settingsManager } from '../config.js';
import { useForceUpdate } from '../hooks/useForceUpdate.js';
import { PopupManager } from './popup/PopupManager.js';

export const FlowChartSettings: FC = () => {
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();

  const updateAndRefresh = useCallback(
    (updater: (currentSettings: ExtensionSettings) => void) => {
      const currentSettings = settingsManager.getSettings();
      updater(currentSettings);
      settingsManager.saveSettings();
      forceUpdate();
    },
    [forceUpdate],
  );

  return (
    <div className="flowchart-settings">
      <div className="inline-drawer">
        <div className="inline-drawer-toggle inline-drawer-header">
          <b>FlowChart</b>
          <div className="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div className="inline-drawer-content">
          <div className="flowchart-container">
            <div className="setting-row">
              <label>Enabled</label>
              <STInput
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateAndRefresh((s) => (s.enabled = checked));
                  // @ts-ignore
                  if (window.updateFlowChartFateToggleUI) window.updateFlowChartFateToggleUI();
                }}
              />
            </div>

            <div className="setting-row">
              <STButton
                // @ts-ignore
                onClick={() => window.openFlowChartDataPopup()}
              >
                Customize Prompts & Data
              </STButton>
            </div>
          </div>
        </div>
      </div>
      <PopupManager />
    </div>
  );
};
