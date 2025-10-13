import { FC, useCallback } from 'react';
import { STButton, STInput } from 'sillytavern-utils-lib/components';
import { ExtensionSettings, settingsManager, DEFAULT_SETTINGS } from '../config.js';
import { useForceUpdate } from '../hooks/useForceUpdate.js';
import { PopupManager } from './popup/PopupManager.js';
import { flowRunner } from '../FlowRunner.js';
import { st_echo } from 'sillytavern-utils-lib/config';

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

  const handleResetEverything = async () => {
    const { Popup } = SillyTavern.getContext();
    const confirmation = await Popup.show.confirm(
      'Reset All FlowChart Settings',
      'Are you sure you want to reset EVERYTHING, including all flows, prompts, and settings, to their original defaults? This action cannot be undone.',
    );

    if (confirmation) {
      // Re-assign properties to the existing settings object to maintain references.
      const currentSettings = settingsManager.getSettings();
      const defaultSettings = structuredClone(DEFAULT_SETTINGS);

      // Clear existing keys and assign defaults
      Object.keys(currentSettings).forEach((key) => delete (currentSettings as any)[key]);
      Object.assign(currentSettings, defaultSettings);

      settingsManager.saveSettings();
      flowRunner.reinitialize();
      st_echo('info', 'FlowChart has been reset to default settings.');
      forceUpdate();

      // Force-refresh the popup's content if it's open during the reset.
      // @ts-ignore
      if (window.forceFlowChartPopupUpdate) {
        // @ts-ignore
        window.forceFlowChartPopupUpdate();
      }
    }
  };

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
                  flowRunner.reinitialize();
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

            <div className="setting-row">
              <STButton onClick={handleResetEverything} color="danger">
                Reset Everything to Default
              </STButton>
            </div>
          </div>
        </div>
      </div>
      <PopupManager />
    </div>
  );
};
