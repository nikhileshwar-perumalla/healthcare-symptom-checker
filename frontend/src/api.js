import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkSymptoms = async (symptoms, age, gender, sessionId) => {
  const response = await api.post('/api/check-symptoms', {
    symptoms,
    age: age || null,
    gender: gender || null,
    session_id: sessionId || null,
  });
  return response.data;
};

export const getHistory = async (limit = 10, sessionId = null) => {
  const params = { limit };
  if (sessionId) params.session_id = sessionId;
  
  const response = await api.get('/api/history', { params });
  return response.data;
};

export const getQuery = async (queryId) => {
  const response = await api.get(`/api/query/${queryId}`);
  return response.data;
};

export const getDisclaimer = async () => {
  const response = await api.get('/api/disclaimer');
  return response.data;
};

export default api;
