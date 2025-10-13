import { FC, ReactNode } from 'react';
import { NodeResizer } from '@xyflow/react';
import { useFlowRunStore } from '../popup/flowRunStore.js';
import { NodeRunReport } from './NodeRunReport.js';

type BaseNodeProps = {
  id: string;
  title: string;
  children: ReactNode;
  selected: boolean;
};

export const BaseNode: FC<BaseNodeProps> = ({ id, title, children, selected }) => {
  const { isVisualizationVisible, nodeReports, executionOrder } = useFlowRunStore((state) => ({
    isVisualizationVisible: state.isVisualizationVisible,
    nodeReports: state.nodeReports,
    executionOrder: state.executionOrder,
  }));

  const report = nodeReports.get(id);
  const showReport = isVisualizationVisible && report;
  const statusClass = showReport ? `run-${report.status}` : '';
  const executionOrderIndex = isVisualizationVisible ? executionOrder.indexOf(id) + 1 : 0;

  return (
    <div
      className={statusClass}
      style={{
        border: '1px solid #777',
        padding: '10px',
        background: '#333',
        fontSize: '12px',
        minWidth: 180,
        position: 'relative',
      }}
    >
      {executionOrderIndex > 0 && <div className="execution-order-badge">{executionOrderIndex}</div>}
      <NodeResizer isVisible={selected} minWidth={180} minHeight={50} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <label>{title}</label>
      </div>
      {children}
      {showReport && <NodeRunReport report={report} />}
    </div>
  );
};
