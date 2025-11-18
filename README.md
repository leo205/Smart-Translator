# Smart Translator

A web-based translation application with context-aware translation powered by Google's Gemini AI.

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with your free API key:

**Option 1: Groq (Recommended - Fast & Free)**
```
GROQ_API_KEY=your_groq_api_key_here
```
Get your free API key at: https://console.groq.com/keys (No credit card required!)

**Option 2: Hugging Face (Alternative)**
```
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```
Get your free API key at: https://huggingface.co/settings/tokens (No credit card required!)

**Note:** Groq is recommended because it's faster, which is perfect for real-time translation! But both work fine and are free! 

### 3. Run the Backend Server

From the project root directory:

```bash
python src/main.py
```

Or using uvicorn directly:

```bash
cd src
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://127.0.0.1:8000`

### 4. Open the Frontend

You have two options:

**Option A: Simple (for development)**
- Just open `index.html` directly in your browser (double-click it)

**Option B: Using a local server (recommended)**
- Using Python's built-in server:
  ```bash
  python -m http.server 5500
  ```
  Then open `http://localhost:5500` in your browser

- Or use VS Code's Live Server extension if you have it installed

## Usage

1. Make sure the backend is running (step 3)
2. Open the frontend in your browser (step 4)
3. Select source and target languages
4. **Start typing** - translation happens automatically as you type! (No button needed)
5. Or click "Translate" button if you prefer manual translation

**Features:**
- ✨ **Real-time translation** - translates as you type (with smart debouncing)
- 🚀 **Free API** - uses Groq or Hugging Face (both free!)
- 🧠 **Smart translation** - handles slang, idioms, and informal language
- ⚡ **Fast** - Groq API is extremely fast for real-time use

## Project Structure

```
Translator/
├── index.html          # Frontend HTML
├── src/
│   ├── main.py        # FastAPI backend server
│   ├── script.js      # Frontend JavaScript
│   └── style.css      # Frontend styles
└── requirements.txt   # Python dependencies
```

