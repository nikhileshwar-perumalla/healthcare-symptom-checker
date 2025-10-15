import React from 'react';

function History({ history }) {
  if (!history || history.length === 0) {
    return (
      <div>
        <h2>Query History</h2>
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <p>No queries yet</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div>
      <h2>Query History</h2>
      <div className="history-list">
        {history.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-date">{formatDate(item.created_at)}</div>
            <div className="history-symptoms"><strong>Symptoms:</strong> {item.symptoms}</div>
            <div className="history-conditions"><strong>Conditions:</strong> {item.conditions_summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
