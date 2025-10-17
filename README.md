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

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Framework**: Express
- **Database**: None (no persistence)
- **LLM Integration**: Google AI Studio (Gemini only)
- **API Endpoints**:
  - `POST /api/check-symptoms` - Analyze symptoms
  - `GET /api/disclaimer` - Get medical disclaimer

### Frontend (React)
- **Framework**: React 18
- **Styling**: Custom CSS with responsive design
- **API Client**: Axios for HTTP requests
- **Components**:
  - SymptomForm - Input interface
  - Results - Display analysis
  - DisclaimerBanner - Safety warnings

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

The frontend will open automatically at `http://localhost:3000`

## ☁️ Deploy Backend on Vercel (Node)

This repo is configured to deploy the Node/Express backend via `@vercel/node`. The backend uses only Gemini; no other LLM providers or local heuristics are used.

Routes:
- All routes go to `/api/node.js` (Express app)

Steps:
1. Push this repo to GitHub (done)
2. Import into Vercel and deploy
3. Set environment variables:
  - `LLM_PROVIDER` = `google`
  - `GOOGLE_API_KEY` = your key
  - `GOOGLE_MODEL` = `gemini-2.5-flash` (or your chosen Gemini model)

After deploy, Vercel will give you a URL like `https://<project>.vercel.app`.
Use `https://<project>.vercel.app/health` and `https://<project>.vercel.app/api/check-symptoms` to test.

### Node backend (no DB)

Endpoints:
- POST `/api/check-symptoms`
- GET `/api/disclaimer`

Vercel route for Node backend:
- `/api/node` (the Node serverless entry)

Local run:
```
cd node-backend
npm install
npm run dev
```

## 📖 API Documentation

### Check Symptoms

**Endpoint**: `POST /api/check-symptoms`

**Request Body**:
```json
{
  "symptoms": "I have a headache, fever, and sore throat",
  "age": 25,
  "gender": "Female",
  "session_id": "optional-session-id"
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
  "query_id": 1,
  "timestamp": "2025-10-15T12:00:00"
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

## 🧪 Testing

### Test the Backend API

1. Ensure the backend is running
2. Use the `/health` endpoint to verify configuration
3. Try the health check endpoint:
```bash
curl http://localhost:8000/health
```

### Test Symptom Analysis

```bash
curl -X POST http://localhost:8000/api/check-symptoms \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "persistent cough and shortness of breath",
    "age": 30,
    "gender": "Male"
  }'
```

## 📊 LLM Integration Details

### Prompt Engineering

The system uses a carefully crafted system prompt that:
- Emphasizes educational purpose and safety
- Requires structured JSON output
- Prioritizes emergency symptom detection
- Maintains conservative medical assessments
- Includes clear probability ratings

### Example LLM Prompt:

**System**: "You are a medical information assistant designed to provide educational information about health symptoms..."

**User**: "Symptoms: persistent cough and shortness of breath\nAge: 30\nGender: Male"

**Output**: Structured JSON with conditions, recommendations, and warnings

## 🎨 User Interface

### Features:
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Clear Visual Hierarchy**: Important warnings highlighted
- **Probability Indicators**: Color-coded probability badges (High/Medium/Low)
- **Priority System**: Recommendations sorted by priority
- **Emergency Alerts**: Prominent warnings for urgent conditions
<!-- No persistent history in this version -->

## 🔐 Security Considerations

- API keys stored in environment variables (never in code)
- For local development only, you can set `REACT_APP_GOOGLE_API_KEY` and `ALLOW_CLIENT_API_KEY=1` to forward the key in an HTTP header. Do not enable this in production.
- Input validation on both frontend and backend
- Rate limiting (can be added for production)
- CORS properly configured
- No PHI (Protected Health Information) storage beyond session
- Clear disclaimers on all outputs

## 📁 Project Structure

```
healthcare-symptom-checker/
├── api/
│   └── node.js               # Vercel serverless entry (Node)
├── node-backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js            # Express app with routes
│       └── server.js         # Local dev server
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── DisclaimerBanner.js
│   │   │   ├── SymptomForm.js
│   │   │   ├── Results.js
│   │   │   
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── api.js
│   │   └── index.js
│   └── package.json
├── vercel.json
└── README.md
```

## 🎥 Demo Video Script

### Recording Steps:

1. **Introduction** (30 seconds)
   - Show landing page with disclaimer
   - Explain educational purpose

2. **Basic Usage** (1 minute)
   - Enter simple symptoms: "headache and fever"
   - Show analysis results
   - Highlight probability ratings
   - Show recommendations

3. **Advanced Features** (1 minute)
   - Add age and gender information
   - Enter more complex symptoms
   - Show emergency warning detection
 

4. **Technical Overview** (1 minute)
  - Hit `/health` to show configuration
  - Quick code walkthrough
  - LLM integration explanation

5. **Conclusion** (30 seconds)
   - Reiterate safety disclaimers
   - Summary of features
   - GitHub repository link

### Demo Example Inputs:

**Example 1** (Low severity):
```
Symptoms: "mild headache and runny nose for 1 day"
Expected: Common cold, low-medium probability
```

**Example 2** (Medium severity):
```
Symptoms: "persistent cough, fever 101°F, fatigue for 3 days"
Age: 45
Expected: Possible respiratory infection, medium-high probability
```

**Example 3** (Emergency):
```
Symptoms: "severe chest pain, shortness of breath, dizziness"
Age: 60
Expected: Emergency warning, immediate medical attention recommended
```

## 🚀 Deployment

### Deployment

This project is optimized for Vercel (Node serverless) as described above. You can also deploy the Node backend to any Node hosting provider and serve the React frontend with any static host.

## 🛠️ Development

### Adding New Features

1. **New LLM Provider**: Edit `node-backend/src/app.js` (see `analyzeSymptoms`) and add provider logic
2. **New Endpoints**: Add Express routes in `node-backend/src/app.js`
3. **UI Components**: Create in `frontend/src/components/`
4. **Database Models**: Not applicable (no database in this version)

### Code Quality

- Backend: Node + Express best practices (optional ESLint/Prettier)
- Frontend: React best practices
- Async/await for all database and LLM operations
- Comprehensive error handling

## 📝 License

This project is for educational purposes. Please ensure compliance with medical software regulations if deploying for public use.

## 🤝 Contributing

This is an educational project. Key areas for improvement:
- Additional LLM providers
- Enhanced symptom parsing
- Multi-language support
- More sophisticated emergency detection
- Integration with medical databases

## 📧 Support

For issues or questions:
1. Use `/health` to verify configuration and status
2. Review the disclaimer and safety information
3. Consult the code comments for implementation details

## ✅ Evaluation Checklist

- ✅ Accepts symptom text input
- ✅ Queries LLM for analysis
- ✅ Returns probable conditions
- ✅ Provides recommendations
- ✅ Includes safety disclaimers
- 
- ✅ Frontend form interface
- ✅ Emergency symptom detection
- ✅ Well-structured code
- ✅ Comprehensive documentation
- ✅ Demo-ready

---

**Built with ❤️ for educational purposes. Always consult healthcare professionals for medical advice.**
# healthcare-symptom-checker
