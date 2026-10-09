/**
 * AI Library Assistance Agent - Express & OpenRouter LLM Server
 * Connects the web application to OpenRouter LLM API using credentials from .env
 */

require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Load book catalogue
let catalogue = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'books.json'), 'utf8');
  catalogue = JSON.parse(data);
  console.log(`[Catalogue] Loaded ${catalogue.length} books successfully.`);
} catch (err) {
  console.error('[Catalogue] Error reading books.json:', err.message);
}

/**
 * Helper to get active API key with dynamic .env reload on change
 */
function getApiKey() {
  let key = process.env.OPENROUTER_API_KEY || '';

  // 1. Try reading .env
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const parsed = require('dotenv').parse(fs.readFileSync(envPath));
      for (const k in parsed) process.env[k] = parsed[k];
      if (parsed.OPENROUTER_API_KEY) key = parsed.OPENROUTER_API_KEY.trim();
    }
  } catch (e) {}

  // 2. If still empty, check .env.example as fallback
  if (!key || key.length < 10) {
    try {
      const examplePath = path.join(__dirname, '.env.example');
      if (fs.existsSync(examplePath)) {
        const parsed = require('dotenv').parse(fs.readFileSync(examplePath));
        if (parsed.OPENROUTER_API_KEY && parsed.OPENROUTER_API_KEY.startsWith('sk-or-')) {
          key = parsed.OPENROUTER_API_KEY.trim();
          process.env.OPENROUTER_API_KEY = key;
        }
      }
    } catch (e) {}
  }

  return (key || '').trim();
}

/**
 * Health / API Status check endpoint
 */
app.get('/api/status', (req, res) => {
  const apiKey = getApiKey();
  const isKeyConfigured = apiKey.length > 5 && !apiKey.includes('your_api_key_here');

  res.json({
    hasApiKey: isKeyConfigured,
    model: process.env.OPENROUTER_MODEL || OPENROUTER_MODEL,
    totalBooks: catalogue.length
  });
});

/**
 * Helper: Send HTTPS request to OpenRouter API
 */
function callOpenRouter(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': `http://localhost:${PORT}`,
        'X-Title': 'AI Library Assistance Agent'
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({
              statusCode: res.statusCode,
              error: parsed.error || parsed.message || responseBody
            });
          }
        } catch (e) {
          reject({
            statusCode: res.statusCode,
            error: `Failed to parse response: ${responseBody}`
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        statusCode: 500,
        error: `Network error connecting to OpenRouter: ${err.message}`
      });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * POST /api/recommend
 * Dynamic LLM Recommendation Endpoint
 */
app.post('/api/recommend', async (req, res) => {
  const apiKey = getApiKey();
  const activeModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL;

  if (!apiKey || apiKey.length < 5 || apiKey.includes('your_api_key_here')) {
    return res.status(400).json({
      error: 'OPENROUTER_API_KEY is not configured in .env file. Please paste your valid API key in .env and retry.'
    });
  }

  const { subject, difficulty, purpose } = req.body;

  if (!subject || !difficulty || !purpose) {
    return res.status(400).json({
      error: 'Missing required parameters: subject, difficulty, or purpose.'
    });
  }

  // Build System Prompt
  const systemPrompt = `You are the AI Library Assistance Agent, an intelligent academic librarian and computer science curriculum advisor.
Your objective is to examine a student's learning request and evaluate books from the provided book catalogue.

Student Requirements:
- Target Subject: "${subject}"
- Target Difficulty Level: "${difficulty}" (Options: Beginner, Intermediate, Advanced)
- Purpose of Learning: "${purpose}" (Options: Exam Preparation, Project Development, Interview Preparation, Gaining Basic Knowledge)

Your Tasks:
1. INFORMATION RETRIEVAL:
   - Identify books from the provided catalogue matching the requested subject. Subject match is the PRIMARY requirement: if books exist for the requested subject (e.g. "Python"), all top recommendations and comparison candidates MUST be books directly in that subject! Only consider adjacent subjects if the requested subject has fewer than 3 books in the catalogue.
   - If the student's requested subject does NOT exist or has no relevant books in the catalogue (e.g. quantum physics, cooking, non-computer science), set "hasMatches": false, suggest alternative subjects present in the catalogue, and provide top fallback books.

2. FILTERING & COMPARISON:
   - For matching candidates, evaluate difficulty level alignment with the student's target level.
   - Evaluate alignment with the student's specific learning purpose.
   - Assign an intelligent Relevance Score (0 to 100) based on your reasoning (reflecting subject fit, difficulty calibration, and purpose suitability).
   - Rank the books in descending order of relevance score.

3. RECOMMENDATION:
   - "topRecommendations" MUST contain an array of EXACTLY 3 books:
     • 1st item: The #1 best match for the student.
     • 2nd item: The #2 next best book in this subject.
     • 3rd item: The #3 alternative or complementary book in this subject.
     (Only return fewer than 3 if the entire catalogue has fewer than 3 books related to the subject domain).
   - For each of the 3 recommended books, write an insightful, personalized "recommendationReason" explaining WHY this book was chosen, how its difficulty level serves them, and how it aligns with or complements their learning goal.
   - In "comparisonTable", include ALL candidate books evaluated for this subject (all 4-5 books in this subject category) sorted by relevanceScore in descending order.

STRICT JSON OUTPUT FORMAT ONLY:
Return a single valid JSON object with no markdown wrapping or preamble, matching this exact structure:
{
  "hasMatches": true,
  "summary": "Brief 1-2 sentence overview of findings",
  "topRecommendations": [
    {
      "id": "book-id",
      "title": "Book Title",
      "author": "Author Name",
      "subject": "Subject Name",
      "difficulty": "Beginner|Intermediate|Advanced",
      "relevanceScore": 95,
      "learningPurposeFit": "Exact Purpose Match|Secondary Purpose Fit",
      "recommendationReason": "Personalized reason tailored to subject, difficulty, and purpose...",
      "highlights": ["Highlight 1", "Highlight 2"]
    }
  ],
  "comparisonTable": [
    {
      "rank": 1,
      "id": "book-id",
      "title": "Book Title",
      "author": "Author Name",
      "subject": "Subject Name",
      "difficulty": "Beginner|Intermediate|Advanced",
      "difficultyFit": "Exact Match|Adjacent Match (1 level higher)|etc.",
      "purposeFit": "Direct Purpose Match|Secondary Fit",
      "relevanceScore": 95,
      "suitabilityTier": "Optimal Match|Strong Match|Moderate Match"
    }
  ],
  "fallback": {
    "explanation": "Explanation when no matches found",
    "suggestedSubjects": ["Subject 1", "Subject 2"]
  }
}`;

  const userPrompt = `Here is the full library book catalogue (JSON array):
${JSON.stringify(catalogue, null, 2)}

Please evaluate and recommend books for:
Subject: "${subject}"
Difficulty: "${difficulty}"
Purpose: "${purpose}"`;

  try {
    console.log(`[LLM Request] Calling OpenRouter model: ${activeModel} for subject: "${subject}"`);

    const openRouterResponse = await callOpenRouter(apiKey, {
      model: activeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const choice = openRouterResponse.choices && openRouterResponse.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error('Invalid response structure from OpenRouter API');
    }

    let rawContent = choice.message.content.trim();

    // Strip markdown code fences if present (e.g. ```json ... ```)
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const parsedData = JSON.parse(rawContent);

    // Merge with catalogue metadata (ratings, pages, etc.) if needed
    if (parsedData.topRecommendations) {
      parsedData.topRecommendations = parsedData.topRecommendations.map(rec => {
        const original = catalogue.find(b => b.id === rec.id || b.title.toLowerCase() === rec.title.toLowerCase());
        return {
          ...original,
          ...rec,
          rating: original?.rating || 4.8,
          learningPurpose: original?.learningPurpose || [purpose]
        };
      });
    }

    res.json({
      success: true,
      modelUsed: openRouterResponse.model || OPENROUTER_MODEL,
      data: parsedData
    });
  } catch (err) {
    console.error('[LLM Error]', err);
    res.status(500).json({
      error: err.error?.message || err.error || err.message || 'Failed to generate recommendations from LLM.'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` AI Library Assistance Agent Server running!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` OpenRouter Model: ${OPENROUTER_MODEL}`);
  console.log(` API Key Loaded: ${process.env.OPENROUTER_API_KEY ? 'YES (configured)' : 'NO (awaiting key in .env)'}`);
  console.log(`====================================================`);
});
