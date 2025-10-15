import React from 'react';

function Results({ results }) {
  if (!results) return null;

  const getProbabilityClass = (probability) => {
    const prob = probability.toLowerCase();
    if (prob === 'high') return 'probability-high';
    if (prob === 'medium') return 'probability-medium';
    return 'probability-low';
  };

  const getPriorityClass = (priority) => {
    const pri = priority.toLowerCase();
    if (pri === 'high') return 'priority-high';
    if (pri === 'medium') return 'priority-medium';
    return 'priority-low';
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Analysis Results</h2>

      {results.emergency_warning && (
        <div className="emergency-warning">
          <h3>🚨 EMERGENCY WARNING</h3>
          <p>{results.emergency_warning}</p>
        </div>
      )}

      <div className="conditions-section">
        <h3>Probable Conditions</h3>
        {results.probable_conditions.map((condition, index) => (
          <div key={index} className="condition-card">
            <div className="condition-header">
              <span className="condition-name">{condition.name}</span>
              <span className={`probability-badge ${getProbabilityClass(condition.probability)}`}>
                {condition.probability} Probability
              </span>
            </div>
            <p className="condition-description">{condition.description}</p>
            {condition.common_symptoms && condition.common_symptoms.length > 0 && (
              <div className="common-symptoms">
                {condition.common_symptoms.map((symptom, idx) => (
                  <span key={idx} className="symptom-tag">{symptom}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="recommendations-section">
        <h3>Recommendations</h3>
        {results.recommendations.map((rec, index) => (
          <div key={index} className="recommendation-card">
            <div className="recommendation-header">
              <span className="category-badge">{rec.category}</span>
              <span className={`priority-badge ${getPriorityClass(rec.priority)}`}>
                {rec.priority} Priority
              </span>
            </div>
            <p className="recommendation-action">{rec.action}</p>
          </div>
        ))}
      </div>

      {results.disclaimer && (
        <div className="disclaimer-box">
          {results.disclaimer}
        </div>
      )}
    </div>
  );
}

export default Results;
