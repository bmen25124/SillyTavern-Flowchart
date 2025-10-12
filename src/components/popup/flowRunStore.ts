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
  isVisualizationVisible: boolean;
  activeNodeId: string | null; // <-- ADDED

  // Actions
  startRun: (runId: string) => void;
  setActiveNode: (runId: string, nodeId: string | null) => void; // <-- ADDED
  addNodeReport: (runId: string, nodeId: string, report: NodeReport) => void;
  endRun: (runId: string, status: 'completed' | 'error') => void;
  toggleVisualization: () => void;
  clearRun: () => void;
}

export const useFlowRunStore = create<FlowRunState>()(
  devtools(
    (set) => ({
      runId: null,
      runStatus: 'idle',
      nodeReports: new Map(),
      isVisualizationVisible: false,
      activeNodeId: null, // <-- ADDED

      startRun: (runId) => set({ runId, runStatus: 'running', nodeReports: new Map(), activeNodeId: null }),

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

      endRun: (runId, status) =>
        set((state) => {
          if (state.runId !== runId) return {}; // Stale run, ignore
          return { runStatus: status, isVisualizationVisible: true, activeNodeId: null };
        }),

      toggleVisualization: () => set((state) => ({ isVisualizationVisible: !state.isVisualizationVisible })),

      clearRun: () =>
        set({
          runId: null,
          runStatus: 'idle',
          nodeReports: new Map(),
          isVisualizationVisible: false,
          activeNodeId: null,
        }),
    }),
    { name: 'FlowRunStore' },
  ),
);
