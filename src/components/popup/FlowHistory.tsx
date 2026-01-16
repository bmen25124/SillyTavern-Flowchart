import { FC, useState } from 'react';
import { STButton } from 'sillytavern-utils-lib/components/react';
import { notify } from '../../utils/notify.js';
import { clearExecutionHistory, executionHistory } from '../../FlowRunner.js';
import { safeJsonStringify } from '../../utils/safeJsonStringify.js';

export const FlowHistory: FC = () => {
  const [history, setHistory] = useState([...executionHistory]);

  const clear = () => {
    clearExecutionHistory();
    setHistory([]);
  };

  const handleCopy = (data: any) => {
    const jsonString = safeJsonStringify(data, 2);
    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        notify('info', 'History JSON copied to clipboard.', 'ui_action');
      })
      .catch((err) => {
        notify('error', 'Failed to copy history JSON.', 'ui_action');
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="flowchart-popup-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3>Run History</h3>
        <STButton onClick={clear} color="danger">
          Clear History
        </STButton>
      </div>
      {history.length === 0 ? (
        <p>No flow executions recorded yet.</p>
      ) : (
        <ul className="flowchart-history-list">
          {history.map((report, index) => {
            const hasError = !!report.error;
            return (
              <li key={index}>
                <details>
                  <summary
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      color: hasError ? 'var(--danger)' : 'inherit',
                    }}
                  >
                    <span style={{ flexGrow: 1 }}>
                      Flow: <strong>{report.flowId}</strong> at {new Date(report.timestamp).toLocaleString()} (
                      {report.executedNodes.length} nodes executed)
                      {hasError && ' - FAILED'}
                    </span>
                    <STButton
                      className="fa-solid fa-copy"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent details from toggling
                        handleCopy(report);
                      }}
                      title="Copy JSON"
                      style={{ flexShrink: 0 }}
                    />
                  </summary>
                  {hasError && (
                    <div className="flow-history-error">
                      <strong>Error at Node {report.error?.nodeId}:</strong>
                      <pre>{report.error?.message}</pre>
                    </div>
                  )}
                  <pre>{safeJsonStringify(report.executedNodes, 2)}</pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
