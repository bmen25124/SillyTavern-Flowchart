import { FC, useState } from 'react';
import { STButton } from 'sillytavern-utils-lib/components';
import { executionHistory } from '../../FlowRunner.js';

export const FlowHistory: FC = () => {
  const [history, setHistory] = useState([...executionHistory]);

  const clearHistory = () => {
    executionHistory.length = 0;
    setHistory([]);
  };

  return (
    <div className="flowchart-popup-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3>Run History</h3>
        <STButton onClick={clearHistory} color="danger">
          Clear History
        </STButton>
      </div>
      {history.length === 0 ? (
        <p>No flow executions recorded yet.</p>
      ) : (
        <ul className="flowchart-history-list">
          {history.map((report, index) => (
            <li key={index}>
              <details>
                <summary>
                  Flow: <strong>{report.flowId}</strong> at {report.timestamp.toLocaleString()} (
                  {report.executedNodes.length} nodes executed)
                </summary>
                <pre>{JSON.stringify(report.executedNodes, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
