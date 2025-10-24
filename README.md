Live app: https://healthcare-symptom-checker-front.vercel.app

Demo video: https://drive.google.com/file/d/1KVuEkQFwS8QvmkxybWkkC5Yij4edwp2l/view?usp=sharing

# 🏥 Healthcare Symptom Checker

An educational AI-powered symptom checker that analyzes user-reported symptoms and provides probable conditions with recommendations. This application uses Gemini (Google AI Studio) exclusively to provide intelligent, contextual medical information for educational purposes only.

## ⚠️ IMPORTANT MEDICAL DISCLAIMER

**THIS APPLICATION IS FOR EDUCATIONAL PURPOSES ONLY**

- This tool does not provide medical advice, diagnosis, or treatment
- It is not a substitute for professional medical consultation
- Always seek the advice of your physician or qualified health provider
- Never disregard professional medical advice or delay seeking it
- If you think you have a medical emergency, call emergency services immediately

## 🎯 Features

- **Symptom Analysis**: Input symptoms in natural language and receive AI-powered analysis
- **Probable Conditions**: Get a list of possible medical conditions with probability ratings
- **Smart Recommendations**: Receive actionable next steps categorized by priority
- **Emergency Detection**: Automatic identification of emergency symptoms with urgent warnings
- (No database): This version does not store query history
- **Safety-First Design**: Comprehensive disclaimers and safety warnings throughout
- **Modern UI**: Clean, responsive React interface with intuitive design

## 🏗️ Architecture (brief)

- Backend: Node.js + Express (no DB). Gemini only.
- Frontend: React 18 + Axios. Clean, responsive UI.
- Endpoints:
  - `POST /api/check-symptoms` – Analyze symptoms
  - `GET /api/disclaimer` – Medical disclaimer

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- Google AI Studio API key

### Backend Setup (Node)

1. Navigate to the Node backend:
```bash
cd node-backend
```

2. Create `.env` from example and configure keys:
```bash
cp .env.example .env
```

3. Edit `.env` and set:
```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_MODEL=gemini-2.5-flash
LLM_PROVIDER=google
ALLOW_CLIENT_API_KEY=0
```

4. Install and run:
```bash
npm install
npm run dev
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will open automatically at `http://localhost:3000` (or the next available port).

## ☁️ Deploy (brief)

- Vercel: The serverless entry is `api/node.js` (forwards to Express). Set env vars:
  - `GOOGLE_API_KEY`, `LLM_PROVIDER=google`, `GOOGLE_MODEL=gemini-2.5-flash`.
  - Test: `/health`, `/api/check-symptoms` on your Vercel URL.

## 📖 API Documentation

### Check Symptoms

**Endpoint**: `POST /api/check-symptoms`

**Request Body** (JSON):
```json
{
  "symptoms": "I have a headache, fever, and sore throat",
  "age": 25,
  "gender": "Female"
}
```

**Response**:
```json
{
  "probable_conditions": [
    {
      "name": "Common Cold",
      "probability": "High",
      "description": "Viral upper respiratory infection",
      "common_symptoms": ["headache", "fever", "sore throat"]
    }
  ],
  "recommendations": [
    {
      "category": "Self-Care",
      "action": "Rest and drink plenty of fluids",
      "priority": "Medium"
    }
  ],
  "disclaimer": "Medical disclaimer text...",
  "emergency_warning": null,
  "timestamp": "2025-10-15T12:00:00Z"
}
```

<!-- History endpoint removed in no-DB version -->

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
# LLM Provider Configuration (Google only)
GOOGLE_API_KEY=your_key_here
LLM_PROVIDER=google
GOOGLE_MODEL=gemini-2.5-flash

# Server (local dev)
PORT=8000
```

**Frontend (.env)** (optional):
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_API_KEY= # Optional: provide Gemini key from client for local dev only
```

## 🧪 Quick test

```bash
# Health
curl http://localhost:8000/health

# Check symptoms
curl -X POST http://localhost:8000/api/check-symptoms \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "persistent cough and shortness of breath",
    "age": 30,
    "gender": "Male"
  }'
```

## 📊 LLM integration (brief)
- Gemini-only via `@google/generative-ai`.
- Balanced outputs with conservative probabilities and emergency gating.

## 🎨 UI (brief)
- Responsive layout, clear warnings, probability badges, and prioritized recommendations.

## 🔐 Security Considerations

- API keys stored in environment variables (never in code)
- For local development only, you can set `REACT_APP_GOOGLE_API_KEY` and `ALLOW_CLIENT_API_KEY=1` to forward the key in an HTTP header. Do not enable this in production.
- Input validation on both frontend and backend
- Rate limiting (can be added for production)
- CORS properly configured
- No PHI (Protected Health Information) storage beyond session
- Clear disclaimers on all outputs

## 📁 Structure (brief)
- `node-backend/` – Express API (`src/app.js`, `src/server.js`)
- `frontend/` – React app (components, styling)
- `api/node.js` – Vercel serverless entry forwarding to Express

## 🎥 Demo tip
- Under the input, you can add a helper like: 
  - “Example prompt: Based on these symptoms, suggest possible conditions and next steps with an educational disclaimer.”

## 🚀 Deployment

### Deployment

This project is optimized for Vercel (Node serverless) as described above. You can also deploy the Node backend to any Node hosting provider and serve the React frontend with any static host.

## 🛠️ Development (brief)
- Backend: Node + Express; Frontend: React. See code comments for details.

## 📝 License

This project is for educational purposes. Please ensure compliance with medical software regulations if deploying for public use.

## 🤝 Contributing
- PRs welcome for UX, safety messaging, and model prompt refinement.

## 📧 Support

For issues or questions:
1. Use `/health` to verify configuration and status
2. Review the disclaimer and safety information
3. Consult the code comments for implementation details

## ✅ Checklist
- Input symptoms → LLM analysis → Structured results
- Probabilities, recommendations, emergency gating
- Safety disclaimers and no database storage

---

**Built with ❤️ for educational purposes. Always consult healthcare professionals for medical advice.**
# healthcare-symptom-checker
