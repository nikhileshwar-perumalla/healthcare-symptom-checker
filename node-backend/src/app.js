import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Default DB to disabled in serverless unless explicitly enabled
const ENABLE_DB = !['0', 'false', 'False', 'no', 'No'].includes(process.env.ENABLE_DB || '0');
const NO_LLM = ['1', 'true', 'True', 'yes', 'Yes'].includes(process.env.NO_LLM || '0');
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
  res.json({ status: 'healthy', message: 'API is operational' });
});

app.get('/api/disclaimer', (req, res) => {
  res.json({ disclaimer: MEDICAL_DISCLAIMER });
});

// LLM integration via OpenAI SDK
async function analyzeSymptoms({ symptoms, age, gender }) {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.OPENAI_API_KEY;

  // Local fallback: if NO_LLM is enabled or no API key, return a stubbed safe response
  if (NO_LLM || !apiKey) {
    const lower = (symptoms || '').toLowerCase();
    const likelyCold = /cough|sore throat|runny nose|congestion|sneez/.test(lower);
    const conditions = likelyCold
      ? [
          {
            name: 'Common Cold',
            probability: 'Medium',
            description: 'A mild viral upper respiratory infection that usually resolves on its own.',
            common_symptoms: ['sore throat', 'runny nose', 'cough']
          }
        ]
      : [
          {
            name: 'Non-specific symptoms',
            probability: 'Low',
            description: 'Insufficient information to suggest a specific condition.',
            common_symptoms: []
          }
        ];
    return {
      probable_conditions: conditions,
      recommendations: [
        {
          category: 'Self-Care',
          action: 'Rest, stay hydrated, and monitor symptoms. Seek professional care if symptoms worsen.',
          priority: 'Low'
        }
      ],
      emergency_warning: null
    };
  }

  if (provider !== 'openai') {
    throw new Error('Node backend currently supports LLM_PROVIDER=openai');
  }
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  const SYSTEM_PROMPT = `You are a medical information assistant designed to provide educational information about health symptoms.

CRITICAL SAFETY RULES:
1. ALWAYS emphasize that this is for educational purposes only and not medical advice.
2. ALWAYS recommend consulting a healthcare professional for diagnosis/treatment.
3. Identify emergency symptoms and urge immediate medical attention when appropriate.
4. Do NOT provide prescriptions or specific treatments; focus on general guidance.
5. Be cautious and conservative; prioritize patient safety.

Task: Analyze the provided symptoms and return structured JSON with:
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

Output ONLY valid JSON (no extra commentary). Keep responses concise, safety-focused, and educational.`;

  const userPrompt = [
    `Symptoms: ${symptoms}`,
    age ? `Age: ${age}` : null,
    gender ? `Gender: ${gender}` : null,
    '',
    'Please analyze these symptoms and provide probable conditions with recommendations. Remember to include emergency warnings if applicable.'
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const text = response.choices?.[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(text);
  } catch (_) {
    return {
      probable_conditions: [
        {
          name: 'Unable to parse response',
          probability: 'Unknown',
          description:
            'The system encountered an error analyzing your symptoms. Please consult a healthcare professional.',
          common_symptoms: [],
        },
      ],
      recommendations: [
        {
          category: 'Follow-up',
          action: 'Please consult a healthcare professional for proper evaluation of your symptoms.',
          priority: 'High',
        },
      ],
      emergency_warning: null,
    };
  }
}

app.post('/api/check-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender, session_id } = req.body || {};
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
      return res.status(422).json({ detail: 'Invalid "symptoms"; must be a string of length >= 3' });
    }
    const llm = await analyzeSymptoms({ symptoms, age, gender });
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

    if (ENABLE_DB && QueryModel) {
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
    const msg = err?.message || 'Error processing symptoms';
    return res.status(500).json({ detail: msg });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    if (!ENABLE_DB || !QueryModel) return res.json([]);
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
    if (!ENABLE_DB || !QueryModel) return res.status(404).json({ detail: 'Query not found (DB disabled)' });
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
    await mongoose.connect(MONGO_URL);
  }
  return app;
}

export default app;
