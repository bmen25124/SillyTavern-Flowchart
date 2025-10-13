import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface NodeReport {
  status: 'completed' | 'error';
  input: any;
  output: any;
  error?: string;
}

interface FlowRunState {
  runId: string | null;
  runStatus: 'idle' | 'running' | 'completed' | 'error';
  nodeReports: Map<string, NodeReport>;
  executionOrder: string[];
  isVisualizationVisible: boolean;
  activeNodeId: string | null;

  // Actions
  startRun: (runId: string) => void;
  setActiveNode: (runId: string, nodeId: string | null) => void;
  addNodeReport: (runId: string, nodeId: string, report: NodeReport) => void;
  endRun: (runId: string, status: 'completed' | 'error', executedNodes: { nodeId: string }[]) => void;
  toggleVisualization: () => void;
  clearRun: () => void;
}

export const useFlowRunStore = create<FlowRunState>()(
  devtools(
    (set) => ({
      runId: null,
      runStatus: 'idle',
      nodeReports: new Map(),
      executionOrder: [],
      isVisualizationVisible: false,
      activeNodeId: null,

      startRun: (runId) =>
        set({ runId, runStatus: 'running', nodeReports: new Map(), activeNodeId: null, executionOrder: [] }),

      setActiveNode: (runId, nodeId) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale event
          return { activeNodeId: nodeId };
        }),

      addNodeReport: (runId, nodeId, report) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale report, ignore
          const newReports = new Map(state.nodeReports);
          newReports.set(nodeId, report);
          return { nodeReports: newReports };
        }),

      endRun: (runId, status, executedNodes = []) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale run, ignore
          return {
            runStatus: status,
            isVisualizationVisible: true,
            activeNodeId: null,
            executionOrder: executedNodes.map((n) => n.nodeId),
          };
        }),

      toggleVisualization: () => set((state) => ({ isVisualizationVisible: !state.isVisualizationVisible })),

      clearRun: () =>
        set({
          runId: null,
          runStatus: 'idle',
          nodeReports: new Map(),
          isVisualizationVisible: false,
          activeNodeId: null,
          executionOrder: [],
        }),
    }),
    { name: 'FlowRunStore' },
  ),
);
