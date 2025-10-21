import React from 'react';
import { createRoot } from 'react-dom/client';

import { FlowchartSettings } from './components/Settings.js';
import { settingsManager } from './config.js';

import { st_echo } from 'sillytavern-utils-lib/config';
import { flowRunner } from './FlowRunner.js';

import Handlebars from 'handlebars';

import './styles/main.scss';
import '@xyflow/react/dist/style.css';

if (!Handlebars.helpers['slice']) {
  Handlebars.registerHelper('slice', function (context, count) {
    if (!Array.isArray(context)) return [];
    return context.slice(count);
  });
}

if (!Handlebars.helpers['add']) {
  Handlebars.registerHelper('add', function (value1, value2) {
    return value1 + value2;
  });
}

function renderReactSettings() {
  const settingsContainer = document.getElementById('extensions_settings');
  if (!settingsContainer) {
    console.error('Flowchart: Extension settings container not found.');
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
      <FlowchartSettings />
    </React.StrictMode>,
  );
}

function main() {
  renderReactSettings();
  flowRunner.reinitialize();
}

settingsManager
  .initializeSettings()
  .then(main)
  .catch((error) => {
    console.error(error);
    st_echo('error', 'Flowchart data migration failed. Check console for details.');
  });
