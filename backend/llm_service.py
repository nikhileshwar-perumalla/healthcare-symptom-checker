import os
import json
from typing import Dict, Any
from dotenv import load_dotenv
import openai
from anthropic import Anthropic

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")


class LLMService:
    """Service for interacting with LLM providers"""
    
    SYSTEM_PROMPT = """You are a medical information assistant designed to provide educational information about health symptoms. 

CRITICAL SAFETY RULES:
1. ALWAYS emphasize that this is for educational purposes only
2. ALWAYS recommend consulting a healthcare professional for proper diagnosis
3. Identify emergency symptoms and urge immediate medical attention
4. Do not provide specific treatment recommendations or prescriptions
5. Be cautious and conservative in assessments

Your task is to analyze symptoms and provide:
1. Probable conditions (with probability levels: High/Medium/Low)
2. Recommendations for next steps
3. Emergency warnings if applicable

Format your response as valid JSON with this exact structure:
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
  "emergency_warning": "Warning message if emergency symptoms detected, null otherwise"
}

Be thorough but concise. Always prioritize patient safety."""

    def __init__(self):
        if LLM_PROVIDER == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            openai.api_key = OPENAI_API_KEY
            self.client = openai
            self.model = OPENAI_MODEL
        elif LLM_PROVIDER == "anthropic":
            if not ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
            self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
            self.model = ANTHROPIC_MODEL
        else:
            raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}")
        
        self.provider = LLM_PROVIDER
    
    async def analyze_symptoms(self, symptoms: str, age: int = None, gender: str = None) -> Dict[str, Any]:
        """
        Analyze symptoms using LLM and return structured response
        
        Args:
            symptoms: Patient's symptom description
            age: Patient's age (optional)
            gender: Patient's gender (optional)
            
        Returns:
            Dictionary containing probable conditions and recommendations
        """
        # Build user prompt with context
        user_prompt = f"Symptoms: {symptoms}"
        if age:
            user_prompt += f"\nAge: {age}"
        if gender:
            user_prompt += f"\nGender: {gender}"
        
        user_prompt += "\n\nPlease analyze these symptoms and provide probable conditions with recommendations. Remember to include emergency warnings if applicable."
        
        try:
            if self.provider == "openai":
                response = await self._call_openai(user_prompt)
            else:
                response = await self._call_anthropic(user_prompt)
            
            # Parse JSON response
            parsed_response = json.loads(response)
            return parsed_response
            
        except json.JSONDecodeError as e:
            # Fallback response if JSON parsing fails
            return {
                "probable_conditions": [
                    {
                        "name": "Unable to parse response",
                        "probability": "Unknown",
                        "description": "The system encountered an error analyzing your symptoms. Please consult a healthcare professional.",
                        "common_symptoms": []
                    }
                ],
                "recommendations": [
                    {
                        "category": "Follow-up",
                        "action": "Please consult a healthcare professional for proper evaluation of your symptoms.",
                        "priority": "High"
                    }
                ],
                "emergency_warning": None
            }
        except Exception as e:
            raise Exception(f"Error analyzing symptoms: {str(e)}")
    
    async def _call_openai(self, user_prompt: str) -> str:
        """Call OpenAI API"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent medical information
            max_tokens=2000
        )
        return response.choices[0].message.content
    
    async def _call_anthropic(self, user_prompt: str) -> str:
        """Call Anthropic API"""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            temperature=0.3,
            system=self.SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return message.content[0].text


# Create singleton instance
llm_service = LLMService()
