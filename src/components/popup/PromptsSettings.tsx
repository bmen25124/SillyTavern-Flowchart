import { FC } from 'react';
import { STTextarea } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../../config.js';

export const PromptsSettings: FC = () => {
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();

  const handlePromptChange = (promptKey: keyof ExtensionSettings['prompts'], value: string) => {
    settings.prompts[promptKey] = value;
    forceUpdate();
  };

  const restoreSinglePrompt = (promptKey: keyof ExtensionSettings['prompts']) => {
    settings.prompts[promptKey] = DEFAULT_SETTINGS.prompts[promptKey];
    forceUpdate();
  };

  return (
    <div className="flowchart-popup-section">
      <h3>Prompt Templates</h3>
      {Object.keys(settings.prompts).map((key) => {
        const promptKey = key as keyof ExtensionSettings['prompts'];
        return (
          <div className="setting-row" key={key}>
            <div className="title_restorable">
              <label style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
              <button
                className="fa-solid fa-undo"
                title={`Restore ${key} to default`}
                onClick={() => restoreSinglePrompt(promptKey)}
              ></button>
            </div>
            <STTextarea
              value={settings.prompts[promptKey]}
              onChange={(e) => handlePromptChange(promptKey, e.target.value)}
              rows={8}
            />
          </div>
        );
      })}
    </div>
  );
};
