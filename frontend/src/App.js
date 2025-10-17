import React, { useState } from 'react';
import './App.css';
import { checkSymptoms } from './api';
import SymptomForm from './components/SymptomForm';
import Results from './components/Results';
import DisclaimerBanner from './components/DisclaimerBanner';

function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  // No session id needed for demo

  const handleSubmit = async (symptoms, age, gender) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
  const response = await checkSymptoms(symptoms, age, gender);
      setResults(response);
      
  // No history reload (history feature removed)
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while analyzing symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🏥 Healthcare Symptom Checker</h1>
        <p>Educational symptom analysis powered by AI</p>
      </header>

      <DisclaimerBanner />

      <div className="main-content">
        <div className="card symptom-form">
          <SymptomForm onSubmit={handleSubmit} loading={loading} />
        </div>

        <div className="card results">
          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Analyzing your symptoms...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {results && !loading && (
            <Results results={results} />
          )}

          {!results && !loading && !error && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Enter your symptoms to get started</p>
            </div>
          )}
        </div>

        {/* History section removed */}
      </div>
    </div>
  );
}

export default App;
