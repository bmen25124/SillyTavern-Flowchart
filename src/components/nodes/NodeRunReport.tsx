import { FC, useState } from 'react';
import { NodeReport } from '../popup/flowRunStore.js';
import { safeJsonStringify } from '../../utils/safeJsonStringify.js';
import { STButton } from 'sillytavern-utils-lib/components/react';
import { notify } from '../../utils/notify.js';

interface NodeRunReportProps {
  report: NodeReport;
}

export const NodeRunReport: FC<NodeRunReportProps> = ({ report }) => {
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('output');

  const handleCopy = (data: any) => {
    navigator.clipboard
      .writeText(safeJsonStringify(data))
      .then(() => notify('info', 'Copied to clipboard.', 'ui_action'))
      .catch(() => notify('error', 'Failed to copy.', 'ui_action'));
  };

  return (
    <div className="node-run-report">
      <details>
        <summary>
          Status: <span className={`status-${report.status}`}>{report.status}</span>
        </summary>
        <div className="report-content">
          {report.error && <pre className="report-error">{report.error}</pre>}
          <div className="report-tabs">
            <STButton onClick={() => setActiveTab('input')} className={activeTab === 'input' ? 'active' : ''}>
              Input
            </STButton>
            <STButton onClick={() => setActiveTab('output')} className={activeTab === 'output' ? 'active' : ''}>
              Output
            </STButton>
            <div style={{ flex: 1 }} />
            <STButton
              className="fa-solid fa-copy"
              onClick={() => handleCopy(activeTab === 'input' ? report.input : report.output)}
            />
          </div>
          <pre className="report-data nowheel">
            {safeJsonStringify(activeTab === 'input' ? report.input : report.output)}
          </pre>
        </div>
      </details>
    </div>
  );
};
