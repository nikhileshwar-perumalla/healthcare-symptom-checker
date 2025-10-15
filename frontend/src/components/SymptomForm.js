import React, { useState } from 'react';

function SymptomForm({ onSubmit, loading }) {
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (symptoms.trim()) {
      onSubmit(symptoms, age ? parseInt(age) : null, gender || null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Describe Your Symptoms</h2>
      
      <div className="form-group">
        <label htmlFor="symptoms">Symptoms *</label>
        <textarea
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Describe your symptoms in detail. For example: 'I have a headache, fever, and sore throat for the past 2 days...'"
          required
          disabled={loading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="age">Age (optional)</label>
          <input
            type="number"
            id="age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Your age"
            min="0"
            max="120"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender (optional)</label>
          <input
            type="text"
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            placeholder="Male/Female/Other"
            disabled={loading}
          />
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={loading || !symptoms.trim()}>
        {loading ? 'Analyzing...' : 'Analyze Symptoms'}
      </button>
    </form>
  );
}

export default SymptomForm;
