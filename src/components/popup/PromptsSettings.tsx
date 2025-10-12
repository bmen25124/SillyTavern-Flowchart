import { FC } from 'react';
import { STTextarea, STInput, STButton } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { st_echo } from 'sillytavern-utils-lib/config';

export const PromptsSettings: FC = () => {
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();

  const handlePromptContentChange = (key: string, value: string) => {
    settings.prompts[key] = value;
    forceUpdate();
  };

  const handlePromptNameChange = (oldKey: string, newKey: string) => {
    if (newKey && newKey !== oldKey) {
      if (settings.prompts[newKey]) {
        st_echo('error', `A prompt named "${newKey}" already exists.`);
        return;
      }
      const value = settings.prompts[oldKey];
      delete settings.prompts[oldKey];
      settings.prompts[newKey] = value;
      forceUpdate();
    }
  };

  const addPrompt = () => {
    let newKey = 'New Prompt';
    let i = 1;
    while (settings.prompts[newKey]) {
      newKey = `New Prompt ${i++}`;
    }
    settings.prompts[newKey] = 'Your prompt template here...';
    forceUpdate();
  };

  const removePrompt = (key: string) => {
    delete settings.prompts[key];
    forceUpdate();
  };

  return (
    <div className="flowchart-popup-section">
      <h3>Prompt Templates</h3>
      <div className="flowchart-prompts-editor">
        {Object.entries(settings.prompts).map(([key, value]) => (
          <div className="prompt-item" key={key}>
            <div className="prompt-header">
              <STInput
                value={key}
                onBlur={(e) => handlePromptNameChange(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              <STButton onClick={() => removePrompt(key)} color="danger">
                Delete
              </STButton>
            </div>
            <STTextarea value={value} onChange={(e) => handlePromptContentChange(key, e.target.value)} rows={8} />
          </div>
        ))}
        <STButton onClick={addPrompt} color="primary">
          Add New Prompt
        </STButton>
      </div>
    </div>
  );
};
