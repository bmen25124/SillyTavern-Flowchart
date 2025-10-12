import { FC, useEffect } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { eventEmitter } from '../../events.js';
import { safeJsonStringify } from '../../utils/safeJsonStringify.js';

interface DebugState {
  isRunning: boolean;
  activeNodeId: string | null;
  steps: { nodeId: string; type?: string; input: any; output: any }[];
  startRun: () => void;
  addStep: (step: { nodeId: string; type?: string; input: any; output: any }) => void;
  setActiveNode: (nodeId: string | null) => void;
  endRun: () => void;
}

export const useDebugStore = create<DebugState>()(
  devtools(
    (set) => ({
      isRunning: false,
      activeNodeId: null,
      steps: [],
      startRun: () => set({ isRunning: true, steps: [], activeNodeId: null }),
      addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
      setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
      endRun: () => set({ isRunning: false, activeNodeId: null }),
    }),
    { name: 'FlowDebugStore' },
  ),
);

export const DebugPanel: FC = () => {
  const { isRunning, steps, activeNodeId } = useDebugStore();

  useEffect(() => {
    const onStart = () => useDebugStore.getState().startRun();
    const onNodeStart = (nodeId: string) => useDebugStore.getState().setActiveNode(nodeId);
    const onNodeEnd = (report: any) => {
      useDebugStore.getState().addStep(report);
      useDebugStore.getState().setActiveNode(null);
    };
    const onEnd = () => useDebugStore.getState().endRun();

    eventEmitter.on('flow:start', onStart);
    eventEmitter.on('node:start', onNodeStart);
    eventEmitter.on('node:end', onNodeEnd);
    eventEmitter.on('flow:end', onEnd);
    eventEmitter.on('flow:error', onEnd);

    return () => {
      eventEmitter.off('flow:start', onStart);
      eventEmitter.off('node:start', onNodeStart);
      eventEmitter.off('node:end', onNodeEnd);
      eventEmitter.off('flow:end', onEnd);
      eventEmitter.off('flow:error', onEnd);
    };
  }, []);

  return (
    <div className="flowchart-popup-section">
      <h3>Debug Output</h3>
      {isRunning && (
        <div>
          <p>Flow is running... {activeNodeId && `(Executing: ${activeNodeId})`}</p>
        </div>
      )}
      {!isRunning && steps.length === 0 && <p>Run a flow with "Manual Trigger" nodes to see debug output.</p>}
      {steps.length > 0 && (
        <ul className="flowchart-history-list">
          {steps.map((step, index) => (
            <li key={index}>
              <details>
                <summary>
                  <strong>{step.type || 'Node'}</strong> ({step.nodeId})
                </summary>
                <h4>Input</h4>
                <pre>{safeJsonStringify(step.input)}</pre>
                <h4>Output</h4>
                <pre>{safeJsonStringify(step.output)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
