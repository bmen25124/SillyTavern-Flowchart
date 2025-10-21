import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getNodesBounds, getViewportForBounds, useReactFlow } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { PresetItem, PresetButtonDef } from 'sillytavern-utils-lib/components';
import { useFlowStore } from './flowStore.js';
import { FlowCanvas } from './FlowCanvas.js';
import { FlowToolbar } from './FlowToolbar.js';
import { NodePalette } from './NodePalette.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import { useFlowRunStore } from './flowRunStore.js';
import { settingsManager, createDefaultFlow, FlowData } from '../../config.js';
import { validateFlow } from '../../validator.js';
import { flowRunner } from '../../FlowRunner.js';
import { CURRENT_FLOW_VERSION } from '../../flow-migrations.js';
import { notify } from '../../utils/notify.js';
import { generateUUID } from '../../utils/uuid.js';
import { SpecFlow } from '../../flow-spec.js';
import { eventEmitter } from '../../events.js';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

export const FlowManager: FC = () => {
  const { nodes, edges, loadFlow, getSpecFlow, copySelection, paste } = useFlowStore();
  const { undo, redo } = useFlowStore.temporal.getState();
  const { getNodes, setViewport, screenToFlowPosition, fitView, getViewport } = useReactFlow();
  const settings = settingsManager.getSettings();
  const forceUpdate = useForceUpdate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const { isVisualizationVisible, runId, runStatus, toggleVisualization, clearRun } = useFlowRunStore();
  const activeFlowData = settings.flows.find((f) => f.id === settings.activeFlow);
  const [viewStack, setViewStack] = useState<string[]>([]);

  const handleSelectChange = useCallback(
    (flowId?: string) => {
      if (flowId && settings.flows.some((f) => f.id === flowId)) {
        settings.activeFlow = flowId;
        const flowData = settings.flows.find((f) => f.id === flowId)!.flow;
        loadFlow(structuredClone(flowData));
        useFlowStore.temporal.getState().clear();
        forceUpdate();
      }
    },
    [settings, loadFlow, forceUpdate],
  );

  useEffect(() => {
    if (!settings.flows.find((f) => f.id === settings.activeFlow)) {
      settings.activeFlow = settings.flows[0]?.id || '';
      settingsManager.saveSettings();
      forceUpdate();
    }
    const activeFlowEntry = settings.flows.find((f) => f.id === settings.activeFlow);
    const flowData = activeFlowEntry?.flow || { nodes: [], edges: [] };
    const activeFlowVersion = activeFlowEntry?.flowVersion;
    loadFlow(structuredClone(flowData), activeFlowVersion);
    useFlowStore.temporal.getState().clear();
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
      if (activeFlow && !viewStack.length) {
        activeFlow.flow = getSpecFlow();
        activeFlow.flowVersion = CURRENT_FLOW_VERSION;
        settingsManager.saveSettings();
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges, settings.activeFlow, getSpecFlow, viewStack.length]);

  useEffect(() => {
    const handleSubFlowStart = ({ subFlowId, parentFlowId }: { subFlowId: string; parentFlowId: string | null }) => {
      if (parentFlowId) {
        setViewStack((stack) => [...stack, parentFlowId]);
      }
      handleSelectChange(subFlowId);
    };

    const handleSubFlowEnd = () => {
      setViewStack((stack) => {
        if (stack.length > 0) {
          const newStack = [...stack];
          const lastParent = newStack.pop();
          if (lastParent) {
            handleSelectChange(lastParent);
          }
          return newStack;
        }
        return stack;
      });
    };

    eventEmitter.on('subflow:run:start', handleSubFlowStart);
    eventEmitter.on('subflow:run:end', handleSubFlowEnd);

    return () => {
      eventEmitter.off('subflow:run:start', handleSubFlowStart);
      eventEmitter.off('subflow:run:end', handleSubFlowEnd);
    };
  }, [handleSelectChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isPopupActive = !!document.querySelector('.flowchart-data-popup');
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        !!document.activeElement?.closest('.cm-content');

      if (!isPopupActive || isInputFocused) return;

      const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z';
      const isRedo = (event.ctrlKey || event.metaKey) && event.key === 'y';

      if (isUndo) {
        event.preventDefault();
        undo();
      } else if (isRedo) {
        event.preventDefault();
        redo();
      } else if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          event.preventDefault();
          copySelection();
          const selectedCount = getNodes().filter((n) => n.selected).length;
          if (selectedCount > 0) {
            notify('info', `${selectedCount} node(s) copied.`, 'ui_action');
          }
        } else if (event.key === 'v') {
          event.preventDefault();
          const reactFlowPane = document.querySelector('.react-flow__pane');
          if (reactFlowPane) {
            const paneBounds = reactFlowPane.getBoundingClientRect();
            const position = screenToFlowPosition({
              x: paneBounds.x + paneBounds.width / 2,
              y: paneBounds.y + paneBounds.height / 2,
            });
            paste(position);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, paste, getNodes, screenToFlowPosition, undo, redo, fitView]);

  const { isValid, errors, invalidNodeIds, errorsByNodeId } = useMemo(
    () =>
      validateFlow(getSpecFlow(), activeFlowData?.allowDangerousExecution ?? false, settings.flows, activeFlowData?.id),
    [nodes, edges, getSpecFlow, activeFlowData?.allowDangerousExecution, settings.flows],
  );

  const flowItems = useMemo(
    () => settings.flows.map((flow) => ({ value: flow.id, label: flow.name })),
    [settings.flows],
  );

  const handleCreateFlow = useCallback(
    (newName: string) => {
      const sanitizedName = slugify(newName);
      if (!sanitizedName) {
        notify('error', 'Flow name cannot be empty.', 'ui_action');
        return { confirmed: false };
      }
      if (settings.flows.some((f) => f.name === sanitizedName)) {
        notify('error', `A flow with the name "${sanitizedName}" already exists.`, 'ui_action');
        return { confirmed: false };
      }
      return { confirmed: true, value: { value: generateUUID(), label: sanitizedName } };
    },
    [settings.flows],
  );

  const handleRenameFlow = useCallback(
    (flowId: string, newName: string) => {
      const sanitizedName = slugify(newName);
      if (!sanitizedName) {
        notify('error', 'Flow name cannot be empty.', 'ui_action');
        return { confirmed: false };
      }
      if (settings.flows.some((f) => f.name === sanitizedName && f.id !== flowId)) {
        notify('error', `A flow with the name "${sanitizedName}" already exists.`, 'ui_action');
        return { confirmed: false };
      }
      return { confirmed: true, value: { value: flowId, label: sanitizedName } };
    },
    [settings.flows],
  );

  const handleDeleteFlow = useCallback(
    (flowId: string) => {
      if (settings.flows.length <= 1) {
        notify('error', 'Cannot delete the last flow.', 'ui_action');
        return false;
      }
      return true;
    },
    [settings.flows],
  );

  const handleItemsChange = useCallback(
    (newItems: PresetItem[]) => {
      const oldFlows = settings.flows;
      const newFlows: FlowData[] = [];

      for (const item of newItems) {
        const id = item.value;
        const name = slugify(item.label);
        const existingFlow = oldFlows.find((f) => f.id === id);

        if (existingFlow) {
          newFlows.push({ ...existingFlow, name });
        } else {
          newFlows.push({
            id,
            name,
            flow: createDefaultFlow(),
            flowVersion: CURRENT_FLOW_VERSION,
            allowDangerousExecution: false,
            enabled: true,
          });
        }
      }

      settings.flows = newFlows;

      if (!settings.flows.some((f) => f.id === settings.activeFlow)) {
        settings.activeFlow = newItems.length > 0 ? newItems[0].value : '';
      }

      settingsManager.saveSettings();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const handleRunFlow = useCallback(() => {
    if (!isValid) {
      notify('error', 'Cannot run an invalid flow. Please fix the errors first.', 'ui_action');
      return;
    }
    clearRun();
    flowRunner.runFlowManually(settings.activeFlow);
  }, [isValid, settings.activeFlow, clearRun]);

  const handleCopyToClipboard = useCallback(async () => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;
    try {
      const flowStructure = getSpecFlow();
      const jsonString = JSON.stringify(flowStructure, null, 2);
      await navigator.clipboard.writeText(jsonString);
      notify('info', `Flow "${activeFlow.name}" copied to clipboard as JSON.`, 'ui_action');
    } catch (err) {
      console.error('Failed to copy flow:', err);
      notify('error', 'Failed to copy flow to clipboard.', 'ui_action');
    }
  }, [getSpecFlow, settings.activeFlow, settings.flows]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        notify('error', 'Clipboard is empty.', 'ui_action');
        return;
      }
      let importedFlow = JSON.parse(clipboardText) as SpecFlow;

      if (!importedFlow || !Array.isArray(importedFlow.nodes) || !Array.isArray(importedFlow.edges)) {
        throw new Error('Parsed JSON is not a valid flow structure.');
      }

      let importedFlowVersion: string | undefined = undefined;

      if (importedFlow && typeof importedFlow === 'object' && 'flowVersion' in importedFlow) {
        const flowData = importedFlow as any;
        importedFlow = flowData.flow || importedFlow;
        importedFlowVersion = flowData.flowVersion;
      }

      loadFlow(importedFlow, importedFlowVersion);
      useFlowStore.temporal.getState().clear();
      notify('success', 'Flow imported from clipboard.', 'ui_action');
    } catch (err: any) {
      console.error('Failed to paste flow:', err);
      notify('error', `Failed to paste flow: ${err.message}`, 'ui_action');
    }
  }, [loadFlow]);

  const handleExportToFile = useCallback(() => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;
    const flowToExport: FlowData = {
      ...activeFlow,
      flow: getSpecFlow(),
      flowVersion: CURRENT_FLOW_VERSION,
    };
    const blob = new Blob([JSON.stringify(flowToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFlow.name || 'flowchart'}-flow.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('info', `Flow "${activeFlow.name}" exported to file.`, 'ui_action');
  }, [getSpecFlow, settings.activeFlow, settings.flows]);

  const handleImportFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let importedFlow = JSON.parse(e.target?.result as string);
          if (!importedFlow) {
            throw new Error('Invalid flow file structure.');
          }

          const currentSettings = settingsManager.getSettings();
          let newName = slugify(file.name.replace(/\.json$/, ''));
          if (!newName) {
            newName = 'imported-flow';
          }

          const existingNames = new Set(currentSettings.flows.map((f) => f.name));
          if (existingNames.has(newName)) {
            let i = 1;
            while (existingNames.has(`${newName}-${i}`)) {
              i++;
            }
            newName = `${newName}-${i}`;
          }

          let importedFlowVersion: string | undefined = undefined;

          if (importedFlow && typeof importedFlow === 'object') {
            if ('flowVersion' in importedFlow) {
              const flowData = importedFlow as any;
              importedFlow = flowData.flow || importedFlow;
              importedFlowVersion = flowData.flowVersion;
            } else if ('nodes' in importedFlow && 'edges' in importedFlow) {
            } else {
              throw new Error('Invalid flow file structure.');
            }
          } else {
            throw new Error('Invalid flow file structure.');
          }

          const needsMigration = !importedFlowVersion;

          if (needsMigration) {
            const { Popup } = SillyTavern.getContext();
            const confirmation = await Popup.show.confirm(
              'Flow Import',
              `The imported flow may need to be migrated to work correctly with your current version. Do you want to proceed with import and migration?`,
            );

            if (!confirmation) {
              return;
            }
          }

          const newFlow: FlowData = {
            id: generateUUID(),
            name: newName,
            flow: importedFlow,
            flowVersion: importedFlowVersion || CURRENT_FLOW_VERSION,
            allowDangerousExecution: false,
            enabled: true,
          };

          currentSettings.flows = [...currentSettings.flows, newFlow];
          currentSettings.activeFlow = newFlow.id;

          settingsManager.saveSettings();
          loadFlow(importedFlow, importedFlowVersion);
          useFlowStore.temporal.getState().clear();
          forceUpdate();

          const migrationMessage = needsMigration ? ' (may require migration)' : '';
          notify('info', `Flow "${newName}" imported${migrationMessage} successfully.`, 'ui_action');
        } catch (err: any) {
          console.error('Failed to import flow:', err);
          notify('error', `Failed to import flow: ${err.message}`, 'ui_action');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadFlow, forceUpdate]);

  const handleScreenshot = useCallback(async () => {
    const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
    if (!activeFlow) return;
    const flowElement = document.querySelector<HTMLElement>('.react-flow');
    if (!flowElement) {
      notify('error', 'Could not find the flow element to screenshot.', 'ui_action');
      return;
    }
    const currentNodes = getNodes();
    if (currentNodes.length === 0) {
      notify('warning', 'Cannot take screenshot of an empty flow.', 'ui_action');
      return;
    }

    // Temporarily replace select elements with spans containing their selected value.
    const replacements: { original: HTMLElement; replacement: HTMLElement }[] = [];
    const selects = flowElement.querySelectorAll<HTMLSelectElement>('select');

    selects.forEach((select) => {
      if (select.selectedIndex === -1) return;

      const replacement = document.createElement('span');
      replacement.textContent = select.options[select.selectedIndex].text;
      // Style the span to look like the input field
      replacement.style.display = 'inline-block';
      replacement.style.width = `${select.offsetWidth}px`;
      replacement.style.padding = '4px 8px';
      replacement.style.border = '1px solid var(--SmartThemeBorderColor)';
      replacement.style.borderRadius = '4px';
      replacement.style.backgroundColor = 'var(--SmartThemeInputColor)';
      replacement.style.fontFamily = 'var(--mainFontFamily)';
      replacement.style.fontSize = 'var(--mainFontSize)';
      replacement.style.color = 'var(--text-color-main)';
      replacement.style.boxSizing = 'border-box';

      select.style.display = 'none';
      select.parentNode?.insertBefore(replacement, select);
      replacements.push({ original: select, replacement });
    });

    const imageWidth = 2048;
    const padding = 40;
    const nodesBounds = getNodesBounds(currentNodes);
    const imageBounds = {
      width: nodesBounds.width + padding * 2,
      height: nodesBounds.height + padding * 2,
      x: nodesBounds.x - padding,
      y: nodesBounds.y - padding,
    };
    const imageHeight = (imageBounds.height / imageBounds.width) * imageWidth;
    const viewport = getViewportForBounds(imageBounds, imageWidth, imageHeight, 0.1, 2, {});
    const originalViewport = getViewport();
    setViewport(viewport, { duration: 0 });
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    const previousBg = pane.style.backgroundColor;
    pane.style.backgroundColor = '#202124';

    setTimeout(async () => {
      try {
        const dataUrl = await toPng(flowElement, {
          backgroundColor: '#202124',
          width: imageWidth,
          height: imageHeight,
          filter: (node: HTMLElement) =>
            !node.classList?.contains('react-flow__controls') && !node.classList?.contains('react-flow__minimap'),
          skipFonts: true,
          pixelRatio: 2,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `flowchart-${activeFlow.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dataUrl);
        notify('info', 'Screenshot saved.', 'ui_action');
      } catch (err) {
        console.error('Failed to take screenshot:', err);
        notify('error', 'Failed to take screenshot.', 'ui_action');
      } finally {
        replacements.forEach(({ original, replacement }) => {
          original.style.display = '';
          replacement.remove();
        });
        setViewport(originalViewport, { duration: 0 });
        pane.style.backgroundColor = previousBg;
      }
    }, 100);
  }, [getNodes, setViewport, getViewport, settings.activeFlow, settings.flows]);

  const presetButtons = useMemo(
    (): PresetButtonDef[] => [
      {
        key: 'copy-clipboard',
        icon: 'fa-solid fa-copy',
        title: 'Copy Flow JSON to Clipboard (Ctrl+C)',
        onClick: handleCopyToClipboard,
      },
      {
        key: 'paste-clipboard',
        icon: 'fa-solid fa-paste',
        title: 'Paste Flow from Clipboard (Ctrl+V)',
        onClick: handlePasteFromClipboard,
      },
      {
        key: 'export-file',
        icon: 'fa-solid fa-file-export',
        title: 'Export Flow to File',
        onClick: handleExportToFile,
      },
      {
        key: 'import-file',
        icon: 'fa-solid fa-file-import',
        title: 'Import Flow from File',
        onClick: handleImportFromFile,
      },
      {
        key: 'screenshot',
        icon: 'fa-solid fa-camera',
        title: 'Take Screenshot',
        onClick: handleScreenshot,
      },
    ],
    [handleCopyToClipboard, handlePasteFromClipboard, handleExportToFile, handleImportFromFile, handleScreenshot],
  );

  const handleToggleFlow = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const activeFlow = settings.flows.find((f) => f.id === settings.activeFlow);
      if (!activeFlow) return;
      activeFlow.enabled = e.target.checked;
      settingsManager.saveSettings();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const handleToggleDangerousPermission = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const allow = e.target.checked;
      const activeFlowEntry = settings.flows.find((f) => f.id === settings.activeFlow);
      if (!activeFlowEntry) return;
      if (allow) {
        const { Popup } = SillyTavern.getContext();
        const confirmation = await Popup.show.confirm(
          'Allow Dangerous Operations?',
          'Enabling this allows the flow to run nodes that can execute arbitrary code or make external network requests. This can be a security risk if you import a flow from an untrusted source. Do you want to proceed?',
        );
        if (confirmation) activeFlowEntry.allowDangerousExecution = true;
        else e.target.checked = false;
      } else {
        activeFlowEntry.allowDangerousExecution = false;
      }
      settingsManager.saveSettings();
      forceUpdate();
    },
    [settings, forceUpdate],
  );

  const togglePalette = useCallback(() => {
    settings.isPaletteCollapsed = !settings.isPaletteCollapsed;
    settingsManager.saveSettings();
    forceUpdate();
  }, [settings, forceUpdate]);

  const isFlowEnabled = settings.flows.find((f) => f.id === settings.activeFlow)?.enabled ?? false;
  const isDangerousAllowed = activeFlowData?.allowDangerousExecution ?? false;

  return (
    <div className="flowchart-editor-manager">
      <FlowToolbar
        flowItems={flowItems}
        activeFlowId={settings.activeFlow}
        presetButtons={presetButtons}
        onSelectFlow={handleSelectChange}
        onItemsChange={handleItemsChange}
        onCreateFlow={handleCreateFlow}
        onRenameFlow={handleRenameFlow}
        onDeleteFlow={handleDeleteFlow}
        isFlowEnabled={isFlowEnabled}
        onToggleFlowEnabled={handleToggleFlow}
        isDangerousAllowed={isDangerousAllowed}
        onToggleDangerous={handleToggleDangerousPermission}
        runId={runId}
        isVisualizationVisible={isVisualizationVisible}
        onToggleVisualization={toggleVisualization}
        onClearRun={clearRun}
        isValid={isValid}
        errors={errors}
        runStatus={runStatus}
        onRunFlow={handleRunFlow}
        onStopFlow={() => flowRunner.abortCurrentRun()}
      />
      <div
        className={`flowchart-editor-area ${settings.isPaletteCollapsed ? 'palette-collapsed' : ''}`}
        ref={flowWrapperRef}
      >
        <div className="palette-toggle" onClick={togglePalette} title="Toggle Node Palette">
          <i className={`fa-solid fa-chevron-${settings.isPaletteCollapsed ? 'right' : 'left'}`}></i>
        </div>
        <NodePalette />
        <FlowCanvas invalidNodeIds={invalidNodeIds} errorsByNodeId={errorsByNodeId} />
      </div>
    </div>
  );
};
