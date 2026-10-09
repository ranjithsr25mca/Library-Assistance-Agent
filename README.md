<<<<<<< HEAD
# AI Library Assistance Agent (OpenRouter LLM Integration)

An intelligent, full-stack web application that uses a live **Large Language Model (LLM)** via the **OpenRouter API** to dynamically evaluate a library textbook catalogue, filter candidate books, compare suitability scores (0–100), and generate personalized academic book recommendations.

All hardcoded scoring tables and rule engines have been replaced with **real-time LLM reasoning** powered by your OpenRouter API key.

---

## 🌟 Key Features

1. **Live LLM Reasoning via OpenRouter**
   - Ingests the full 25-book computer science catalogue dynamically into the LLM context.
   - Evaluates student learning parameters (**Subject**, **Difficulty Level**, **Purpose of Learning**).
   - Generates nuanced, personalized recommendation rationales and suitability scores (0–100) dynamically.

2. **Secure Environment Configuration (.env)**
   - API key is stored securely on the backend in `.env` and never exposed to the client browser.
   - Hot-reload enabled: If you update `.env`, the server automatically picks up your new key on the next request without needing a restart!

3. **Multi-Model Support**
   - Configurable model in `.env` (`OPENROUTER_MODEL`).
   - Supports any OpenRouter-compatible model:
     - `openai/gpt-4o-mini` (Fast, cost-efficient, accurate JSON - Default)
     - `meta-llama/llama-3.3-70b-instruct` (Open-source powerhouse)
     - `google/gemini-2.0-flash-001` (Ultra-low latency)
     - `anthropic/claude-3.5-haiku` (Sharp academic analysis)
     - `deepseek/deepseek-chat` / `deepseek/deepseek-r1`

4. **Rich Interactive UI**
   - Live API status badge showing connection state and active model.
   - Top 3 recommendation cards with #1 Gold, #2 Silver, and #3 Bronze tier badges.
   - Dynamic comparison table showing all evaluated candidates, difficulty calibration status, purpose alignment, and suitability verdicts.
   - Smart fallback handling if a non-existent subject is requested (e.g., Quantum Computing or Cooking), providing suggested available subjects with 1-click search chips.
   - Pulsing LLM loading indicator with progress visualization while reasoning.

---

## ⚙️ Quick Setup Guide

### 1. Paste Your OpenRouter API Key
Open the [`.env`](.env) file in the project folder and paste your key:

```env
# Paste your OpenRouter API key:
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Pick any OpenRouter model (default: openai/gpt-4o-mini)
OPENROUTER_MODEL=openai/gpt-4o-mini

# Server Port (default: 3000)
PORT=3000
```

> **Note:** If you don't have an OpenRouter key yet, get one at [openrouter.ai/keys](https://openrouter.ai/keys).

### 2. Run the Server
The dependencies (`express`, `dotenv`) are already installed. Start the server using:

```powershell
npm start
```
*(or `node server.js`)*

### 3. Open in Browser
Open **[http://localhost:3000](http://localhost:3000)** in Google Chrome, Microsoft Edge, or Firefox.

The header badge will show:
`● OpenRouter LLM Active (openai/gpt-4o-mini)`

---

## 🧪 Testing the LLM Recommendation Agent

Try running the four standard test inputs from the interface or using the quick-test buttons:

| Test Case | Subject | Difficulty | Purpose | Expected Output |
|---|---|---|---|---|
| **Test 1** | `Python` | `Beginner` | `Exam Preparation` | LLM selects academic Python textbooks (*Core Python Programming* or *Python Crash Course*) with exam-oriented reasoning and scores. |
| **Test 2** | `Cloud Computing` | `Intermediate` | `Project Development` | LLM recommends applied cloud architecture texts (*Cloud Native Patterns* / *AWS Certified Solutions Architect*) tailored for project builders. |
| **Test 3** | `Artificial Intelligence` | `Advanced` | `Interview Preparation` | LLM recommends high-depth interview preparation & system design books (*Cracking the Machine Learning & AI Interview* / *Deep Learning*). |
| **Test 4** | `Quantum Computing` | `Beginner` | `Gaining Basic Knowledge` | LLM detects no catalogue match, triggers fallback view, explains the gap, and suggests related available topics (*Artificial Intelligence*, *Python*, *Cloud Computing*). |

---

## 📁 Project Structure

```
Library Assistance/
├── .env                # Your local OpenRouter API key & model configuration (Git-ignored)
├── .env.example        # Template configuration file
├── .gitignore          # Prevents committing .env or node_modules
├── package.json        # Node.js dependencies (express, dotenv)
├── server.js           # Express backend connecting to OpenRouter API
├── index.html          # Semantic HTML5 UI layout with loading overlay & API status
├── styles.css          # Modern CSS design system, responsive cards, and comparison table
├── app.js              # Frontend controller fetching recommendations from /api/recommend
└── books.json          # Curated catalogue of 25 realistic computer science textbooks
```

---

## 🛡️ Security Best Practices
- The `.env` file is excluded in `.gitignore` to avoid leaking credentials.
- All OpenRouter API calls are made server-side in `server.js` using HTTPS with Node's native network stack.
- The client browser only communicates with your local backend (`/api/recommend`), keeping your API key safe.
=======
# Library-Assistance-Agent
Develop an AI Library Assistance Agent that recommends suitable books to students from a provided book catalogue. Ask the student to enter the subject, difficulty level (Beginner, Intermediate, or Advanced), and purpose of learning. 
>>>>>>> 6519fa5b3adcf4c6fe52d12f93c49366ed001b73
