from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import requests
import os
from dotenv import load_dotenv
import json

# Load environment variables from a .env file
load_dotenv()

# Groq API - FREE and VERY FAST! Perfect for real-time translation
# Get your free API key at: https://console.groq.com/keys
# No credit card required! Very generous free tier
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Fallback to Hugging Face if Groq is not available
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"

app = FastAPI(
    title="Smart Translator API",
    description="Advanced translation API with context-awareness.",
    version="1.0.0"
)

# This is CRUCIAL for allowing your front-end (Live Server)
# to talk to your back-end (this Python file).
app.add_middleware(
    CORSMiddleware,
    # You can be more specific, but for development, "*" is okay.
    # The default for Live Server is often http://127.0.0.1:5500
    # Change this bottom one to website url
    # so API calls can just work off that url
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models (defines the structure of data)
class TranslationRequest(BaseModel):    
    text: str
    source_language: Optional[str] = "auto"
    target_language: str
    context: Optional[str] = None

class TranslationResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    confidence: float
    ai_enhanced: bool

class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str

# Supported languages (this is a shortened list for brevity, the original is fine)
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English"},
    {"code": "es", "name": "Spanish", "native_name": "Español"},
    {"code": "fr", "name": "French", "native_name": "Français"},
    {"code": "de", "name": "German", "native_name": "Deutsch"},
    {"code": "it", "name": "Italian", "native_name": "Italiano"},
    {"code": "pt", "name": "Portuguese", "native_name": "Português"},
    {"code": "ja", "name": "Japanese", "native_name": "日本語"},
    {"code": "ko", "name": "Korean", "native_name": "한국어"},
    {"code": "zh", "name": "Chinese", "native_name": "中文"},
    # ... include the rest of the languages from your original file
]

def get_language_name(code: str) -> str:
    """Get language name from code"""
    for lang in SUPPORTED_LANGUAGES:
        if lang["code"] == code:
            return lang["name"]
    return "Unknown" 

# API endpoint to get the list of languages
@app.get("/languages", response_model=List[LanguageInfo])
async def get_languages():
    """Get all supported languages"""
    return SUPPORTED_LANGUAGES

# API endpoint that does the actual translation
@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text using Hugging Face's free API"""
    
    if not request.text or not request.text.strip():
        return TranslationResponse(
            translated_text="",
            source_language=request.source_language,
            target_language=request.target_language,
            confidence=0.0,
            ai_enhanced=True
        )
    
    source_lang_name = get_language_name(request.source_language) if request.source_language != "auto" else "the detected language"
    target_lang_name = get_language_name(request.target_language)
    
    # Prompting the LLM (API request)
    prompt = f"""You are a professional translator. Translate the following text from {source_lang_name} to {target_lang_name}.

Requirements:
- Preserve the original tone and intent
- Naturally handle slang, idioms, and informal language
- Keep the translation natural and fluent
{f"- Context: {request.context}" if request.context else ""}

Text to translate: "{request.text}"

Provide ONLY the translated text, nothing else."""
    
    try:
        # Try Groq first (faster and free)
        if GROQ_API_KEY:
            return await translate_with_groq(request, source_lang_name, target_lang_name, prompt)
        
        # Fallback to Hugging Face
        if HF_API_KEY:
            return await translate_with_huggingface(request, source_lang_name, target_lang_name, prompt)
        
        # If no API keys, provide helpful error
        raise HTTPException(
            status_code=500, 
            detail="No API key configured. Please set GROQ_API_KEY or HUGGINGFACE_API_KEY in your .env file. Get free keys at: https://console.groq.com/keys or https://huggingface.co/settings/tokens"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

async def translate_with_groq(request: TranslationRequest, source_lang_name: str, target_lang_name: str, prompt: str):
    """Translate using Groq API (fast and free)"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [
            {
                "role": "system",
                "content": "You are a professional translator. Translate the text accurately, preserving tone, slang, and idioms. Return ONLY the translated text, nothing else."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "model": "llama-3.1-8b-instant",  # Fast and free model
        "temperature": 0.3,
        "max_tokens": 500
    }
    
    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)
    
    if response.status_code != 200:
        error_msg = response.text
        raise Exception(f"Groq API error: {error_msg}")
    
    result = response.json()
    translated_text = result["choices"][0]["message"]["content"].strip()
    
    # Clean up the response
    translated_text = translated_text.strip()
    if translated_text.startswith('"') and translated_text.endswith('"'):
        translated_text = translated_text[1:-1]
    
    prefixes = ["Translation:", "Translated text:", "Here's the translation:"]
    for prefix in prefixes:
        if translated_text.lower().startswith(prefix.lower()):
            translated_text = translated_text[len(prefix):].strip()
    
    return TranslationResponse(
        translated_text=translated_text,
        source_language=request.source_language,
        target_language=request.target_language,
        confidence=0.95,
        ai_enhanced=True
    )

async def translate_with_huggingface(request: TranslationRequest, source_lang_name: str, target_lang_name: str, prompt: str):
    """Translate using Hugging Face API (fallback)"""
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.3,
            "return_full_text": False
        }
    }
    
    response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 503:
        raise HTTPException(status_code=503, detail="Model is loading. Please try again in a few seconds.")
    
    if response.status_code != 200:
        raise Exception(f"Hugging Face API error: {response.text}")
    
    result = response.json()
    
    # Extract the translated text from the response
    if isinstance(result, list) and len(result) > 0:
        translated_text = result[0].get("generated_text", "").strip()
    elif isinstance(result, dict):
        translated_text = result.get("generated_text", "").strip()
    else:
        translated_text = str(result).strip()
    
    # Clean up the response
    translated_text = translated_text.strip()
    if translated_text.startswith('"') and translated_text.endswith('"'):
        translated_text = translated_text[1:-1]
    
    prefixes = ["Translation:", "Translated text:", "Here's the translation:"]
    for prefix in prefixes:
        if translated_text.lower().startswith(prefix.lower()):
            translated_text = translated_text[len(prefix):].strip()
    
    return TranslationResponse(
        translated_text=translated_text,
        source_language=request.source_language,
        target_language=request.target_language,
        confidence=0.90,
        ai_enhanced=True
    )


# This part allows you to run the file directly
if __name__ == "__main__":
    import uvicorn
    # The app will be available at http://127.0.0.1:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)