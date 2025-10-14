import { FC, useEffect } from 'react';
import { STButton, STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import {
  DEFAULT_SETTINGS,
  settingsManager,
  LLM_REQUEST_JSON_PROMPT_KEY,
  LLM_REQUEST_XML_PROMPT_KEY,
} from '../../config.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { useDebounce } from '../../hooks/useDebounce.js';

const CORE_PROMPTS = [LLM_REQUEST_JSON_PROMPT_KEY, LLM_REQUEST_XML_PROMPT_KEY];

export const PromptsSettings: FC = () => {
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();
  const debouncedPrompts = useDebounce(settings.prompts, 500);

  // Auto-save when prompts change after a delay
  useEffect(() => {
    settingsManager.saveSettings();
  }, [debouncedPrompts]);

  const handlePromptChange = (promptKey: string, value: string) => {
    settings.prompts[promptKey] = value;
    forceUpdate();
  };

  const restoreSinglePrompt = (promptKey: string) => {
    // @ts-ignore
    settings.prompts[promptKey] = DEFAULT_SETTINGS.prompts[promptKey];
    forceUpdate();
  };

  const handleAddPrompt = () => {
    let newKey = 'new_prompt';
    let count = 1;
    while (settings.prompts[newKey]) {
      newKey = `new_prompt_${count++}`;
    }
    settings.prompts[newKey] = 'Your new prompt template here. Use {{handlebars}} for variables.';
    forceUpdate();
  };

  const handleRenamePrompt = (oldKey: string, newKey: string) => {
    if (!newKey || CORE_PROMPTS.includes(newKey) || settings.prompts[newKey]) {
      st_echo('error', `Invalid or duplicate prompt name: ${newKey}`);
      forceUpdate(); // Re-render to revert the input field value
      return;
    }
    const value = settings.prompts[oldKey];
    delete settings.prompts[oldKey];
    settings.prompts[newKey] = value;
    forceUpdate();
  };

  const handleDeletePrompt = (keyToDelete: string) => {
    if (CORE_PROMPTS.includes(keyToDelete)) return;
    delete settings.prompts[keyToDelete];
    forceUpdate();
  };

  return (
    <div className="flowchart-popup-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Prompt Templates</h3>
        <STButton onClick={handleAddPrompt}>Add New Prompt</STButton>
      </div>

      {Object.entries(settings.prompts).map(([key, value]) => {
        const isCore = CORE_PROMPTS.includes(key);
        return (
          <div
            className="setting-row"
            key={key}
            style={{ border: '1px solid #555', padding: '10px', borderRadius: '4px' }}
          >
            <div className="title_restorable">
              {isCore ? (
                <label style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
              ) : (
                <STInput
                  defaultValue={key}
                  onBlur={(e) => {
                    if (e.target.value !== key) {
                      handleRenamePrompt(key, e.target.value);
                    }
                  }}
                  title="Rename prompt and press Enter or click away"
                />
              )}

              <div style={{ display: 'flex', gap: '5px' }}>
                {isCore && (
                  <button
                    className="fa-solid fa-undo"
                    title={`Restore ${key} to default`}
                    onClick={() => restoreSinglePrompt(key)}
                  ></button>
                )}
                {!isCore && (
                  <STButton color="danger" onClick={() => handleDeletePrompt(key)}>
                    Delete
                  </STButton>
                )}
              </div>
            </div>
            <STTextarea value={value} onChange={(e) => handlePromptChange(key, e.target.value)} rows={8} />
          </div>
        );
      })}
    </div>
  );
};
