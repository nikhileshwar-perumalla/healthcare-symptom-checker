import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Google-only provider
const LLM_PROVIDER = 'google';
const LLM_CONFIGURED = !!process.env.GOOGLE_API_KEY;
const ALLOW_CLIENT_API_KEY = ['1', 'true', 'True', 'yes', 'Yes'].includes(process.env.ALLOW_CLIENT_API_KEY || '0');

const app = express();
app.use(cors());
app.use(express.json());

// No database usage

const MEDICAL_DISCLAIMER = `\u26a0\ufe0f IMPORTANT MEDICAL DISCLAIMER \u26a0\ufe0f\n\nThis symptom checker is for EDUCATIONAL PURPOSES ONLY and should NOT be used as a substitute for professional medical advice, diagnosis, or treatment.`;

app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'Healthcare Symptom Checker API is running' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'API is operational',
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
  const envModel = (process.env.GOOGLE_MODEL || 'gemini-2.5-flash').trim();
  const fallbackModels = [
    // Prefer stable/latest non-pro Flash models from the user's available list
    envModel,
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    // Previews as later fallbacks
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-lite-preview-09-2025',
    'gemini-2.5-flash-lite-preview-06-17'
  ].filter((v, i, a) => v && a.indexOf(v) === i && !/\bpro\b/i.test(v));

  const genAI = new GoogleGenerativeAI(effectiveGoogleKey);

  async function tryGenerateWithModel(modelName, promptText) {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(promptText);
    const text = typeof result?.response?.text === 'function' ? result.response.text() : '';
    return text;
  }

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

  let text = '';
  let lastErr = null;
  for (const m of fallbackModels) {
    try {
      text = await tryGenerateWithModel(m, prompt);
      if (text && String(text).trim().length > 0) break; // success
    } catch (e) {
      const msg = String(e?.message || e || '');
      // If model not found or not supported for generateContent, try next candidate
      if (/404|not found|not\s+supported|ListModels/i.test(msg)) {
        lastErr = e;
        continue;
      }
      // Other errors: bubble up
      throw e;
    }
  }
  if (!text || String(text).trim().length === 0) {
    const err = new Error('Gemini returned empty response');
    err.statusCode = 502;
    throw (lastErr || err);
  }

  // Normalization helpers to keep responses balanced and non-alarmist
  function normalizeLLMOutput(raw, inputText) {
    const out = typeof raw === 'object' && raw ? JSON.parse(JSON.stringify(raw)) : {};
    out.probable_conditions = Array.isArray(out.probable_conditions) ? out.probable_conditions : [];
    out.recommendations = Array.isArray(out.recommendations) ? out.recommendations : [];
    out.emergency_warning = out.emergency_warning ?? null;

    const lower = (inputText || '').toLowerCase();
    const redFlags = [
      'severe chest pain', 'shortness of breath', 'difficulty breathing', 'confusion', 'stiff neck',
      'rash that doesn\'t blanch', 'non-blanching rash', 'persistent vomiting', 'seizure', 'unresponsive',
      'weakness on one side', 'slurred speech', 'severe abdominal pain', 'blood in stool', 'bloody stool',
      'fainting', 'loss of consciousness', 'pregnant and bleeding', 'infant', 'under 3 months'
    ];
    const hasRedFlag = redFlags.some((flag) => lower.includes(flag));

    const mildTerms = ['fever', 'headache', 'sore throat', 'runny nose', 'cough', 'body aches', 'fatigue', 'congestion'];
    const mildCount = mildTerms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);

    // Gate emergency warnings: only keep if a clear red flag is present
    if (!hasRedFlag) {
      out.emergency_warning = null;
      // Also remove any Emergency category recommendations if no red flags
      out.recommendations = out.recommendations.map((r) => {
        if (!r || typeof r !== 'object') return r;
        if ((r.category || '').toLowerCase() === 'emergency') {
          return { ...r, category: 'Immediate Action', priority: r.priority && r.priority.toLowerCase() === 'high' ? 'High' : 'Medium' };
        }
        return r;
      });
    }

    // Probability balancing: avoid High unless clear red flags or stronger signals
    let highSeen = 0;
    out.probable_conditions = out.probable_conditions.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const prob = (c.probability || '').toString().toLowerCase();
      let newProb = c.probability || 'Medium';

      if (prob === 'high') {
        if (!hasRedFlag && mildCount <= 2) {
          newProb = 'Medium';
        } else {
          highSeen += 1;
          // Only allow a single High when no red flags; demote extras
          if (!hasRedFlag && highSeen > 1) newProb = 'Medium';
        }
      }
      if (prob === 'low' && mildCount >= 3 && !hasRedFlag) {
        // Slightly upweight overly pessimistic lows for common mild presentations
        newProb = 'Medium';
      }
      return { ...c, probability: newProb };
    });

    return out;
  }

  // Try strict parse first, then guarded substring extraction, then normalize
  try {
    const parsed = JSON.parse(text);
    return normalizeLLMOutput(parsed, symptoms);
  } catch {
    const match = (text || '').match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return normalizeLLMOutput(parsed, symptoms);
      } catch {}
    }
    const err = new Error('Gemini returned non-JSON response');
    err.statusCode = 502;
    throw err;
  }
}

app.post('/api/check-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body || {};
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

    return res.json(response);
  } catch (err) {
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const msg = err?.message || 'Error processing symptoms';
    return res.status(status).json({ detail: msg });
  }
});
export async function init() {
  // No DB init required
  return app;
}

export default app;
