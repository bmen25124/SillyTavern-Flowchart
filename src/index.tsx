import React from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';

import { settingsManager, FlowChartSettings } from './components/Settings.js';
import { schemaToExample } from './schema-to-example.js';
import { parseResponse } from './parser.js';

import { buildPrompt, Message, Generator } from 'sillytavern-utils-lib';
import { ExtractedData, StreamResponse } from 'sillytavern-utils-lib/types';
import { selected_group, st_echo, this_chid } from 'sillytavern-utils-lib/config';
import { PromptEngineeringMode } from './config.js';
import * as Handlebars from 'handlebars';
import { flowRunner } from './FlowRunner.js';

import './styles/main.scss';
import '@xyflow/react/dist/style.css';

const generator = new Generator();

async function initializeGlobalUI() {}

function renderReactSettings() {
  const settingsContainer = document.getElementById('extensions_settings');
  if (!settingsContainer) {
    console.error('FlowChart: Extension settings container not found.');
    return;
  }

  let reactRootEl = document.getElementById('flowchart-react-settings-root');
  if (!reactRootEl) {
    reactRootEl = document.createElement('div');
    reactRootEl.id = 'flowchart-react-settings-root';
    settingsContainer.appendChild(reactRootEl);
  }

  const root = createRoot(reactRootEl);
  root.render(
    <React.StrictMode>
      <FlowChartSettings />
    </React.StrictMode>,
  );
}

function main() {
  renderReactSettings();
  initializeGlobalUI();
  flowRunner.reinitialize();
}

settingsManager
  .initializeSettings()
  .then(main)
  .catch((error) => {
    console.error(error);
    st_echo('error', 'FlowChart data migration failed. Check console for details.');
  });
