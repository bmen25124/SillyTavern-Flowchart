import { FC } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FlowManager } from './FlowManager.js';

export const FlowchartEditor: FC = () => {
  return (
    <ReactFlowProvider>
      <FlowManager />
    </ReactFlowProvider>
  );
};
