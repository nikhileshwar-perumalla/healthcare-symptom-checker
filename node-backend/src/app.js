import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Default DB to disabled in serverless unless explicitly enabled
const ENABLE_DB = !['0', 'false', 'False', 'no', 'No'].includes(process.env.ENABLE_DB || '0');
let DB_READY = false;
// Google-only provider
const LLM_PROVIDER = 'google';
const LLM_CONFIGURED = !!process.env.GOOGLE_API_KEY;
const ALLOW_CLIENT_API_KEY = ['1', 'true', 'True', 'yes', 'Yes'].includes(process.env.ALLOW_CLIENT_API_KEY || '0');
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/symptom_checker';

const app = express();
app.use(cors());
app.use(express.json());

// Mongo model (optional)
let QueryModel = null;
if (ENABLE_DB) {
  const schema = new mongoose.Schema(
    {
      symptoms: { type: String, required: true },
      response: { type: Object, required: true },
      conditions: { type: Array },
      recommendations: { type: Array },
      session_id: { type: String },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
  );
  QueryModel = mongoose.model('SymptomQuery', schema);
}

const MEDICAL_DISCLAIMER = `\u26a0\ufe0f IMPORTANT MEDICAL DISCLAIMER \u26a0\ufe0f\n\nThis symptom checker is for EDUCATIONAL PURPOSES ONLY and should NOT be used as a substitute for professional medical advice, diagnosis, or treatment.`;

app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'Healthcare Symptom Checker API is running' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'API is operational',
    db_enabled: ENABLE_DB,
    db_ready: DB_READY,
    llm_provider: LLM_PROVIDER,
    llm_configured: LLM_CONFIGURED,
    allow_client_api_key: ALLOW_CLIENT_API_KEY
  });
});

app.get('/api/disclaimer', (req, res) => {
  res.json({ disclaimer: MEDICAL_DISCLAIMER });
});

// LLM integration via Google AI Studio (Gemini) — Gemini ONLY, no heuristics
async function analyzeSymptoms({ symptoms, age, gender, googleKeyOverride }) {
  const effectiveGoogleKey = googleKeyOverride || process.env.GOOGLE_API_KEY;
  if (!effectiveGoogleKey) {
    const err = new Error('Missing GOOGLE_API_KEY for Gemini');
    err.statusCode = 503;
    throw err;
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const modelName = process.env.GOOGLE_MODEL || 'gemini-1.5-flash';
  const genAI = new GoogleGenerativeAI(effectiveGoogleKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const SYSTEM_PROMPT = `You are a medical information assistant designed to provide educational information about health symptoms.

CRITICAL SAFETY RULES:
1. ALWAYS emphasize that this is for educational purposes only and not medical advice.
2. ALWAYS recommend consulting a healthcare professional for diagnosis/treatment.
3. Identify emergency symptoms and urge immediate medical attention when appropriate.
4. Do NOT provide prescriptions or specific treatments; focus on general guidance.
5. Be cautious and conservative; prioritize patient safety.

Task: Analyze the provided symptoms and return strictly valid JSON with the following schema:
{
  "probable_conditions": [
    {
      "name": "Condition Name",
      "probability": "High|Medium|Low",
      "description": "Brief description",
      "common_symptoms": ["symptom1", "symptom2"]
    }
  ],
  "recommendations": [
    {
      "category": "Immediate Action|Self-Care|Follow-up|Emergency",
      "action": "Specific recommendation",
      "priority": "High|Medium|Low"
    }
  ],
  "emergency_warning": "Warning if emergency symptoms detected, otherwise null"
}

Important output rules:
- Output ONLY raw JSON (no code fences, no extra text).
- Ensure it is parseable with JSON.parse.`;

  const userPrompt = [
    `Symptoms: ${symptoms}`,
    age ? `Age: ${age}` : null,
    gender ? `Gender: ${gender}` : null,
    '',
    'Please analyze these symptoms and provide probable conditions with recommendations. Remember to include emergency warnings if applicable.'
  ].filter(Boolean).join('\n');

  const prompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  const result = await model.generateContent(prompt);
  const text = typeof result?.response?.text === 'function' ? result.response.text() : '';

  // Try strict parse first, then guarded substring extraction; otherwise, raise
  try {
    return JSON.parse(text);
  } catch {
    const match = (text || '').match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    const err = new Error('Gemini returned non-JSON response');
    err.statusCode = 502;
    throw err;
  }
}

app.post('/api/check-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender, session_id } = req.body || {};
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
      return res.status(422).json({ detail: 'Invalid "symptoms"; must be a string of length >= 3' });
    }

    let googleKeyOverride = undefined;
    if (ALLOW_CLIENT_API_KEY) {
      const gk = req.headers['x-google-key'];
      if (typeof gk === 'string' && gk.trim().length > 20) googleKeyOverride = gk.trim();
    }

  const llm = await analyzeSymptoms({ symptoms, age, gender, googleKeyOverride });
    const conditions = llm.probable_conditions || [];
    const recommendations = llm.recommendations || [];
    const emergency_warning = llm.emergency_warning || null;

    const response = {
      probable_conditions: conditions,
      recommendations,
      disclaimer: MEDICAL_DISCLAIMER,
      emergency_warning,
      timestamp: new Date().toISOString(),
    };

    if (ENABLE_DB && QueryModel && DB_READY) {
      const doc = await QueryModel.create({
        symptoms,
        response,
        conditions,
        recommendations,
        session_id: session_id || null,
      });
      response.query_id = doc._id.toString();
    }

    return res.json(response);
  } catch (err) {
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const msg = err?.message || 'Error processing symptoms';
    return res.status(status).json({ detail: msg });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    if (!ENABLE_DB || !QueryModel || !DB_READY) return res.json([]);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const sessionId = req.query.session_id;
    const filter = sessionId ? { session_id: sessionId } : {};
    const items = await QueryModel.find(filter).sort({ created_at: -1 }).limit(limit).lean();
    const history = items.map((q) => {
      const conditions = q.conditions || [];
      let summary = conditions.slice(0, 3).map((c) => c.name || 'Unknown').join(', ');
      if (conditions.length > 3) summary += ` and ${conditions.length - 3} more`;
      return {
        id: q._id.toString(),
        symptoms: q.symptoms.length > 100 ? q.symptoms.slice(0, 100) + '...' : q.symptoms,
        created_at: q.created_at,
        conditions_summary: summary || 'No conditions identified',
      };
    });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ detail: err?.message || 'Error retrieving history' });
  }
});

app.get('/api/query/:id', async (req, res) => {
  try {
    if (!ENABLE_DB || !QueryModel || !DB_READY) return res.status(404).json({ detail: 'Query not found (DB disabled)' });
    const doc = await QueryModel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ detail: 'Query not found' });
    const r = doc.response || {};
    return res.json({
      probable_conditions: r.probable_conditions || [],
      recommendations: r.recommendations || [],
      disclaimer: MEDICAL_DISCLAIMER,
      emergency_warning: r.emergency_warning || null,
      query_id: doc._id.toString(),
      timestamp: doc.created_at,
    });
  } catch (err) {
    return res.status(500).json({ detail: err?.message || 'Error retrieving query' });
  }
});

export async function init() {
  if (ENABLE_DB) {
    try {
      await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
      DB_READY = true;
    } catch (err) {
      console.error('Mongo connection failed:', err?.message || err);
      DB_READY = false;
    }
  }
  return app;
}

export default app;
