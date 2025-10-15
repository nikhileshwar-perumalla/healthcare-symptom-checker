import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// Node 18+ has global fetch; if not available, uncomment the next line
// import fetch from 'node-fetch';

dotenv.config();

// Default DB to disabled in serverless unless explicitly enabled
const ENABLE_DB = !['0', 'false', 'False', 'no', 'No'].includes(process.env.ENABLE_DB || '0');
let DB_READY = false;
const NO_LLM = ['1', 'true', 'True', 'yes', 'Yes'].includes(process.env.NO_LLM || '0');
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const LLM_CONFIGURED = (
  (LLM_PROVIDER === 'openai' && !!process.env.OPENAI_API_KEY && !NO_LLM) ||
  (LLM_PROVIDER === 'huggingface' && !!process.env.HUGGINGFACE_API_KEY && !NO_LLM)
);
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
    llm_mode: NO_LLM ? 'stub' : (LLM_CONFIGURED ? 'live' : 'stub')
  });
});

app.get('/api/disclaimer', (req, res) => {
  res.json({ disclaimer: MEDICAL_DISCLAIMER });
});

// LLM integration via OpenAI SDK
async function analyzeSymptoms({ symptoms, age, gender }) {
  const provider = LLM_PROVIDER;

  // Local fallback: if NO_LLM is enabled or no API key, return a stubbed safe response
  if (NO_LLM || (provider === 'openai' && !process.env.OPENAI_API_KEY) || (provider === 'huggingface' && !process.env.HUGGINGFACE_API_KEY)) {
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

  if (provider === 'huggingface') {
    const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
    const HF_KEY = process.env.HUGGINGFACE_API_KEY;

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
    ].filter(Boolean).join('\n');

    const inputs = `${SYSTEM_PROMPT}\n\nUser:\n${userPrompt}\n\nAssistant: Return ONLY the JSON object.`;

    try {
      const resp = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(HF_MODEL)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs,
            parameters: {
              max_new_tokens: 512,
              temperature: 0.3,
              return_full_text: false
            }
          })
        }
      );

      if (resp.status === 503) {
        // Model loading on free tier; provide friendly fallback
        return {
          probable_conditions: [
            {
              name: 'Model loading — please retry',
              probability: 'Unknown',
              description: 'The free model is warming up. Please try again in a few seconds.',
              common_symptoms: []
            }
          ],
          recommendations: [
            { category: 'Follow-up', action: 'Retry shortly; if symptoms are severe, seek medical care.', priority: 'Medium' }
          ],
          emergency_warning: null
        };
      }

      if (!resp.ok) throw new Error(`HF API error: ${resp.status}`);
      const data = await resp.json();
      // Expect array with generated_text for text-generation
      const text = Array.isArray(data) ? (data[0]?.generated_text || '') : (data?.generated_text || data?.[0]?.generated_text || '');
      try {
        return JSON.parse(text);
      } catch (_) {
        // If the model included preamble, try to extract JSON
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch {}
        }
        // Fallback stub
        return {
          probable_conditions: [
            { name: 'Non-specific symptoms (heuristic)', probability: 'Low', description: 'Unable to parse model output.', common_symptoms: [] }
          ],
          recommendations: [
            { category: 'Follow-up', action: 'Please try again or consult a healthcare professional.', priority: 'Medium' }
          ],
          emergency_warning: null
        };
      }
    } catch (err) {
      // Network or other error; return safe stub
      const lower = (symptoms || '').toLowerCase();
      const likelyCold = /cough|sore throat|runny nose|congestion|sneez/.test(lower);
      return {
        probable_conditions: [
          likelyCold
            ? { name: 'Common Cold (heuristic) — HF unavailable', probability: 'Medium', description: 'Heuristic used due to temporary HF unavailability.', common_symptoms: ['sore throat','runny nose','cough'] }
            : { name: 'Non-specific symptoms (heuristic) — HF unavailable', probability: 'Low', description: 'Heuristic used due to temporary HF unavailability.', common_symptoms: [] }
        ],
        recommendations: [ { category: 'Follow-up', action: 'Please try again later.', priority: 'Low' } ],
        emergency_warning: null
      };
    }
  }

  // Default: OpenAI path
  if (provider !== 'openai') {
    throw new Error('Unsupported LLM_PROVIDER. Use "openai" or "huggingface".');
  }
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  let response;
  try {
    response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
  } catch (err) {
    const code = err?.status || err?.code || err?.error?.type || 'unknown_error';
    const isQuota = code === 429 || String(code).includes('quota') || String(code).includes('rate');
    const lower = (symptoms || '').toLowerCase();
    const likelyCold = /cough|sore throat|runny nose|congestion|sneez/.test(lower);
    const conditions = likelyCold
      ? [
          {
            name: 'Common Cold (heuristic) — LLM unavailable',
            probability: 'Medium',
            description: 'Educational heuristic used due to temporary LLM unavailability.',
            common_symptoms: ['sore throat', 'runny nose', 'cough']
          }
        ]
      : [
          {
            name: 'Non-specific symptoms (heuristic) — LLM unavailable',
            probability: 'Low',
            description: 'Educational heuristic used due to temporary LLM unavailability.',
            common_symptoms: []
          }
        ];
    return {
      probable_conditions: conditions,
      recommendations: [
        {
          category: 'Follow-up',
          action: isQuota
            ? 'The AI service hit a rate/quota limit. Please try again shortly. For concerns, consult a healthcare professional.'
            : 'The AI service is temporarily unavailable. Please try again later. For concerns, consult a healthcare professional.',
          priority: 'Medium'
        }
      ],
      emergency_warning: null
    };
  }

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
    const msg = err?.message || 'Error processing symptoms';
    return res.status(500).json({ detail: msg });
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
