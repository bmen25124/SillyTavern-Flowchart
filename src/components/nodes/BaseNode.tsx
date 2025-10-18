import { CSSProperties, FC, ReactNode, useMemo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { useFlowRunStore } from '../popup/flowRunStore.js';
import { NodeRunReport } from './NodeRunReport.js';
import { useFlowStore } from '../popup/flowStore.js';
import { ValidationIssue } from './definitions/types.js';

type BaseNodeProps = {
  id: string;
  title: string;
  children: ReactNode;
  selected: boolean;
  contentGrows?: boolean;
  minWidth?: number;
};

export const BaseNode: FC<BaseNodeProps> = ({ id, title, children, selected, contentGrows, minWidth = 180 }) => {
  const { isVisualizationVisible, nodeReports, executionOrder } = useFlowRunStore((state) => ({
    isVisualizationVisible: state.isVisualizationVisible,
    nodeReports: state.nodeReports,
    executionOrder: state.executionOrder,
  }));
  const nodeData = useFlowStore((state) => state.nodesMap.get(id)?.data);
  const isNodeDisabled = nodeData?.disabled;
  const validationIssues = (nodeData as any)?._validationErrors as ValidationIssue[] | undefined;

  const nodeLevelIssues = useMemo(() => validationIssues?.filter((iss) => !iss.fieldId) ?? [], [validationIssues]);

  const report = nodeReports.get(id);
  const showReport = isVisualizationVisible && report;

  let statusClass = showReport ? `run-${report.status}` : '';
  if (isNodeDisabled) {
    statusClass += ' node-disabled';
  }

  const executionOrderIndex = isVisualizationVisible ? executionOrder.indexOf(id) + 1 : 0;

  const rootStyle: CSSProperties = {
    border: '1px solid #777',
    padding: '10px',
    background: '#333',
    fontSize: '12px',
    minWidth,
    position: 'relative',
  };

  if (contentGrows) {
    rootStyle.display = 'flex';
    rootStyle.flexDirection = 'column';
    rootStyle.height = '100%';
  }

  const content = contentGrows ? (
    <div style={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>{children}</div>
  ) : (
    children
  );

  return (
    <div className={statusClass} style={rootStyle}>
      {executionOrderIndex > 0 && <div className="execution-order-badge">{executionOrderIndex}</div>}
      {nodeLevelIssues.length > 0 && (
        <div className="node-validation-error-icon" title={nodeLevelIssues.map((iss) => iss.message).join('\n')}>
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
      )}
      <NodeResizer isVisible={selected} minWidth={minWidth} minHeight={50} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <label>{title}</label>
      </div>
      {content}
      {showReport && <NodeRunReport report={report} />}
    </div>
  );
};
