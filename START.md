# How to Start Your Translator App

## Quick Start Guide

### Step 1: Start the Backend (Python API Server)

Open a terminal and run:

```bash
cd /Users/leonardomedina/Documents/GitHub/Translator
python3 src/main.py
```

**What you'll see:**
- The server will start on `http://127.0.0.1:8000`
- You'll see messages like "Uvicorn running on..."
- Keep this terminal window open!

### Step 2: Start the Frontend (Web Server)

Open a **NEW terminal window** (keep the backend running!) and run:

```bash
cd /Users/leonardomedina/Documents/GitHub/Translator
python3 -m http.server 5500
```

**What you'll see:**
- The server will start on `http://localhost:5500`
- Keep this terminal window open too!

### Step 3: Open in Browser

Open your browser and go to:
```
http://localhost:5500
```

## What Each Server Does

- **Backend (port 8000)**: Handles translation requests using the Groq API
- **Frontend (port 5500)**: Serves your HTML/CSS/JavaScript files

## Stopping the Servers

Press `Ctrl + C` in each terminal window to stop the servers.

## Troubleshooting

**Backend won't start?**
- Make sure you have all dependencies: `pip3 install -r requirements.txt`
- Check that your `.env` file has `GROQ_API_KEY=your_key` (no quotes!)

**Frontend shows errors?**
- Make sure the backend is running first!
- Check the browser console (F12) for error messages

**Translation not working?**
- Check that your API key is correct in `.env`
- Make sure both servers are running
- Check the backend terminal for error messages

