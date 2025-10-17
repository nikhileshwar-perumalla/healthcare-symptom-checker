import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: forward a Gemini key from the client for local/dev only.
// Requires backend to set ALLOW_CLIENT_API_KEY=1 to accept this header.
const CLIENT_GOOGLE_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
if (CLIENT_GOOGLE_KEY) {
  api.defaults.headers.common['x-google-key'] = CLIENT_GOOGLE_KEY;
}

export const checkSymptoms = async (symptoms, age, gender) => {
  const response = await api.post('/api/check-symptoms', {
    symptoms,
    age: age || null,
    gender: gender || null,
  });
  return response.data;
};

export const getDisclaimer = async () => {
  const response = await api.get('/api/disclaimer');
  return response.data;
};

export default api;
