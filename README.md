# 🏥 Healthcare Symptom Checker

An educational AI-powered symptom checker that analyzes user-reported symptoms and provides probable conditions with recommendations. This application uses LLM (Large Language Model) technology to provide intelligent, contextual medical information for educational purposes only.

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
- **Query History**: Track previous symptom queries with SQLite database
- **Safety-First Design**: Comprehensive disclaimers and safety warnings throughout
- **Modern UI**: Clean, responsive React interface with intuitive design

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async support
- **Database**: SQLite with SQLAlchemy ORM
- **LLM Integration**: OpenAI GPT-4 or Anthropic Claude
- **API Endpoints**:
  - `POST /api/check-symptoms` - Analyze symptoms
  - `GET /api/history` - Get query history
  - `GET /api/query/{id}` - Get specific query
  - `GET /api/disclaimer` - Get medical disclaimer

### Frontend (React)
- **Framework**: React 18
- **Styling**: Custom CSS with responsive design
- **API Client**: Axios for HTTP requests
- **Components**:
  - SymptomForm - Input interface
  - Results - Display analysis
  - History - Query history
  - DisclaimerBanner - Safety warnings

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- OpenAI API key OR Anthropic API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from example:
```bash
cp .env.example .env
```

5. Edit `.env` and add your API key:
```env
# For OpenAI
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai

# OR for Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
LLM_PROVIDER=anthropic
```

6. Run the backend server:
```bash
python main.py
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

### Get History

**Endpoint**: `GET /api/history?limit=10&session_id=optional`

**Response**:
```json
[
  {
    "id": 1,
    "symptoms": "headache, fever, sore throat",
    "created_at": "2025-10-15T12:00:00",
    "conditions_summary": "Common Cold, Flu"
  }
]
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
# LLM Provider Configuration
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
LLM_PROVIDER=openai  # or anthropic

# Model Selection
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Database
DATABASE_URL=sqlite+aiosqlite:///./symptom_checker.db

# Server
PORT=8000
```

**Frontend (.env)** (optional):
```env
REACT_APP_API_URL=http://localhost:8000
```

## 🧪 Testing

### Test the Backend API

1. Ensure the backend is running
2. Open `http://localhost:8000/docs` for interactive API documentation
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
- **Session History**: Track queries within the current session

## 🔐 Security Considerations

- API keys stored in environment variables (never in code)
- Input validation on both frontend and backend
- Rate limiting (can be added for production)
- CORS properly configured
- No PHI (Protected Health Information) storage beyond session
- Clear disclaimers on all outputs

## 📁 Project Structure

This repository is intentionally minimal for assignment submission. The essential files you need are:

```
healthcare-symptom-checker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and configuration
│   ├── models.py            # Pydantic models
│   ├── llm_service.py       # LLM integration service
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── DisclaimerBanner.js
│   │   │   ├── SymptomForm.js
│   │   │   ├── Results.js
│   │   │   └── History.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── api.js
│   │   └── index.js
│   └── package.json
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
   - Display query history

4. **Technical Overview** (1 minute)
   - Show API documentation at /docs
   - Quick code walkthrough
   - Database query history
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

For this assignment-ready version, local run is the primary path. If you deploy, use your preferred platform and the standard FastAPI/React deployment guides.

## 🛠️ Development

### Adding New Features

1. **New LLM Provider**: Edit `llm_service.py` and add provider logic
2. **New Endpoints**: Add routes in `main.py`
3. **UI Components**: Create in `frontend/src/components/`
4. **Database Models**: Modify `database.py`

### Code Quality

- Backend follows PEP 8 style guidelines
- Frontend uses React best practices
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
1. Check the API documentation at `/docs`
2. Review the disclaimer and safety information
3. Consult the code comments for implementation details

## ✅ Evaluation Checklist

- ✅ Accepts symptom text input
- ✅ Queries LLM for analysis
- ✅ Returns probable conditions
- ✅ Provides recommendations
- ✅ Includes safety disclaimers
- ✅ Stores query history in database
- ✅ Frontend form interface
- ✅ Emergency symptom detection
- ✅ Well-structured code
- ✅ Comprehensive documentation
- ✅ Demo-ready

---

**Built with ❤️ for educational purposes. Always consult healthcare professionals for medical advice.**
