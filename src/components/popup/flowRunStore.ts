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
  nodeReports: Record<string, NodeReport>;
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
      nodeReports: {},
      executionOrder: [],
      isVisualizationVisible: false,
      activeNodeId: null,

      startRun: (runId) =>
        set({ runId, runStatus: 'running', nodeReports: {}, activeNodeId: null, executionOrder: [] }),

      setActiveNode: (runId, nodeId) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale event
          return { activeNodeId: nodeId };
        }),

      addNodeReport: (runId, nodeId, report) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale report, ignore
          return {
            nodeReports: {
              ...state.nodeReports,
              [nodeId]: report,
            },
          };
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
          nodeReports: {},
          isVisualizationVisible: false,
          activeNodeId: null,
          executionOrder: [],
        }),
    }),
    { name: 'FlowRunStore' },
  ),
);
