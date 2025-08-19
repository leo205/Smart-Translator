from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

# Load environment variables from a .env file
load_dotenv()

# Initialize Google AI with your API key
# Make sure you have a .env file with GOOGLE_AI_API_KEY="your_key_here"
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))

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
    return "Unknown" # Return a default value

# API endpoint to get the list of languages
@app.get("/languages", response_model=List[LanguageInfo])
async def get_languages():
    """Get all supported languages"""
    return SUPPORTED_LANGUAGES

# API endpoint that does the actual translation
@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text using the generative model"""
    
    if not os.getenv("GOOGLE_AI_API_KEY"):
        raise HTTPException(status_code=500, detail="Google AI API key not configured. Please check your .env file.")
    
    source_lang_name = get_language_name(request.source_language)
    target_lang_name = get_language_name(request.target_language)
    
    prompt = f"""Translate the following text from {source_lang_name} to {target_lang_name}.
    
    - Preserve the original tone and intent.
    - Naturally handle slang, idioms, and informal language.
    {f"- Use this context for better accuracy: {request.context}" if request.context else ""}
    
    Text to translate: "{request.text}"
    
    Provide ONLY the translated text."""
        
    try:
        model = genai.GenerativeModel('gemini-1.5-pro-latest') # Or your preferred model
        response = model.generate_content(prompt)
        translated_text = response.text.strip()
        
        # Sometimes the model adds quotes, let's remove them.
        if translated_text.startswith('"') and translated_text.endswith('"'):
            translated_text = translated_text[1:-1]

        return TranslationResponse(
            translated_text=translated_text,
            source_language=request.source_language,
            target_language=request.target_language,
            confidence=0.95,  # Generative models are generally confident
            ai_enhanced=True
        )
        
    except Exception as e:
        # Log the error for debugging
        print(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

# This part allows you to run the file directly
if __name__ == "__main__":
    import uvicorn
    # The app will be available at http://127.0.0.1:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)