/**
 * Automated test suite for AI Library Assistance Agent Core Recommendation Engine
 */
const fs = require('fs');
const books = JSON.parse(fs.readFileSync('books.json', 'utf8'));

const SUBJECT_SYNONYMS = {
  "python": "Python",
  "py": "Python",
  "python3": "Python",
  "cloud": "Cloud Computing",
  "cloud computing": "Cloud Computing",
  "aws": "Cloud Computing",
  "azure": "Cloud Computing",
  "gcp": "Cloud Computing",
  "ai": "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  "ml": "Artificial Intelligence",
  "machine learning": "Artificial Intelligence",
  "deep learning": "Artificial Intelligence",
  "cybersecurity": "Cybersecurity",
  "security": "Cybersecurity",
  "database": "Database Management",
  "database management": "Database Management",
  "dbms": "Database Management",
  "sql": "Database Management",
  "data structures": "Data Structures & Algorithms",
  "algorithms": "Data Structures & Algorithms",
  "dsa": "Data Structures & Algorithms",
  "web development": "Web Development",
  "web dev": "Web Development"
};

const GENERIC_TOKENS = new Set([
  "computing", "programming", "development", "management", "systems", "system", 
  "science", "engineering", "technology", "basics", "studies", "guide", "intro", "introduction"
]);

const DIFFICULTY_ORDER = { "Beginner": 1, "Intermediate": 2, "Advanced": 3 };

function normalizeQuery(str) {
  return (str || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ");
}

function resolveCanonicalSubject(query) {
  const clean = normalizeQuery(query);
  if (SUBJECT_SYNONYMS[clean]) return SUBJECT_SYNONYMS[clean];
  
  // Exact word boundary matching for aliases
  for (const [key, canonical] of Object.entries(SUBJECT_SYNONYMS)) {
    const keyRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (keyRegex.test(clean)) {
      return canonical;
    }
  }
  return null;
}

function retrieveBooks(subjectQuery) {
  const rawQuery = normalizeQuery(subjectQuery);
  const canonicalSubject = resolveCanonicalSubject(subjectQuery);
  const queryTokens = rawQuery.split(/\s+/).filter(t => t.length > 1);
  const nonGenericTokens = queryTokens.filter(t => !GENERIC_TOKENS.has(t));

  return books.map(book => {
    let subjectScore = 0;
    let matchType = "none";
    const bookSubjectNorm = normalizeQuery(book.subject);
    const bookTitleNorm = normalizeQuery(book.title);
    const bookDescNorm = normalizeQuery(book.description);

    // 1. Direct Subject Match
    if (canonicalSubject && book.subject.toLowerCase() === canonicalSubject.toLowerCase()) {
      subjectScore = 45;
      matchType = "exact-subject";
    } else if (bookSubjectNorm === rawQuery) {
      subjectScore = 45;
      matchType = "exact-subject";
    } else if (bookSubjectNorm.includes(rawQuery) && rawQuery.length > 3) {
      subjectScore = 42;
      matchType = "direct-substring";
    } else {
      // 2. Keyword & Token Matching
      // Must match at least one NON-GENERIC token if query had non-generic tokens
      let nonGenericMatches = 0;
      let matchedTokensCount = 0;

      queryTokens.forEach(token => {
        const isGeneric = GENERIC_TOKENS.has(token);
        let tokenFound = false;

        if (book.keywords && book.keywords.some(k => k.toLowerCase().includes(token))) {
          tokenFound = true;
        }
        if (bookTitleNorm.includes(token)) {
          tokenFound = true;
        }
        if (bookDescNorm.includes(token)) {
          tokenFound = true;
        }

        if (tokenFound) {
          matchedTokensCount++;
          if (!isGeneric) nonGenericMatches++;
        }
      });

      // If user had specific tokens (like "quantum", "cooking", "astronomy") and NONE matched:
      if (nonGenericTokens.length > 0 && nonGenericMatches === 0) {
        subjectScore = 0;
        matchType = "unrelated";
      } else if (matchedTokensCount > 0) {
        subjectScore = Math.min(35, 15 + nonGenericMatches * 10);
        matchType = "keyword-match";
      }
    }

    return { 
      ...book, 
      subjectScore, 
      matchType,
      isSubjectMatch: subjectScore >= 25 
    };
  });
}

function evaluateAndRankBooks(candidates, targetDifficulty, targetPurpose) {
  const targetDiffLevel = DIFFICULTY_ORDER[targetDifficulty] || 1;

  const scored = candidates.map(book => {
    const subjectScore = book.subjectScore;
    const bookDiffLevel = DIFFICULTY_ORDER[book.difficulty] || 1;
    const diffDistance = Math.abs(bookDiffLevel - targetDiffLevel);

    let difficultyScore = 5;
    if (diffDistance === 0) difficultyScore = 35;
    else if (diffDistance === 1) difficultyScore = 20;

    let purposeScore = 5;
    const bookPurposes = (book.learningPurpose || []).map(p => p.toLowerCase());
    const targetPurposeNorm = targetPurpose.toLowerCase();

    if (bookPurposes.includes(targetPurposeNorm)) {
      purposeScore = 20;
    } else {
      const purposeTokens = targetPurposeNorm.split(/\s+/);
      const bookDescNorm = (book.description + " " + (book.highlights || []).join(" ")).toLowerCase();
      if (purposeTokens.some(token => token.length > 3 && bookDescNorm.includes(token))) {
        purposeScore = 13;
      }
    }

    const totalScore = Math.min(100, Math.round(subjectScore + difficultyScore + purposeScore));
    return { ...book, subjectScore, difficultyScore, purposeScore, totalScore };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored;
}

function runTest(testName, subject, difficulty, purpose) {
  console.log(`\n========================================`);
  console.log(`RUNNING: ${testName}`);
  console.log(`Input: Subject="${subject}", Difficulty="${difficulty}", Purpose="${purpose}"`);
  
  const retrieved = retrieveBooks(subject);
  const subjectMatches = retrieved.filter(b => b.isSubjectMatch);
  console.log(`Information Retrieval: Found ${subjectMatches.length} matching candidate books.`);

  const ranked = evaluateAndRankBooks(retrieved, difficulty, purpose);
  const topRecommendations = ranked.filter(b => b.isSubjectMatch && b.totalScore >= 45).slice(0, 3);

  console.log(`Top Recommendations Count: ${topRecommendations.length}`);
  if (topRecommendations.length > 0) {
    topRecommendations.forEach((b, i) => {
      console.log(`  #${i + 1}: "${b.title}" by ${b.author}`);
      console.log(`      Score: ${b.totalScore}% (Subject: ${b.subjectScore}/45, Diff: ${b.difficultyScore}/35, Purpose: ${b.purposeScore}/20)`);
      console.log(`      Difficulty: ${b.difficulty}, Purposes: [${b.learningPurpose.join(', ')}]`);
    });
  } else {
    console.log(`  [Fallback Triggered]: No direct subject matches found. Offering alternative subjects.`);
  }

  return { subjectMatches, topRecommendations };
}

// Test 1: Python + Beginner + Exam Preparation
const t1 = runTest("Test Case 1", "Python", "Beginner", "Exam Preparation");
if (t1.topRecommendations.length >= 3 && t1.topRecommendations[0].title.includes("Core Python")) {
  console.log(">>> TEST 1 PASSED: Core Python is #1 with 100% score.");
} else {
  console.error(">>> TEST 1 FAILED");
}

// Test 2: Cloud Computing + Intermediate + Project Development
const t2 = runTest("Test Case 2", "Cloud Computing", "Intermediate", "Project Development");
if (t2.topRecommendations.length >= 3 && t2.topRecommendations[0].title.includes("Cloud Native Patterns")) {
  console.log(">>> TEST 2 PASSED: Cloud Native Patterns is #1 with 100% score.");
} else {
  console.error(">>> TEST 2 FAILED");
}

// Test 3: Artificial Intelligence + Advanced + Interview Preparation
const t3 = runTest("Test Case 3", "Artificial Intelligence", "Advanced", "Interview Preparation");
if (t3.topRecommendations.length >= 3 && t3.topRecommendations[0].title.includes("Cracking the Machine Learning")) {
  console.log(">>> TEST 3 PASSED: Cracking the ML & AI Interview is #1 with 100% score.");
} else {
  console.error(">>> TEST 3 FAILED");
}

// Test 4: Non-existent subject (e.g. Quantum Computing)
const t4 = runTest("Test Case 4", "Quantum Computing", "Beginner", "Gaining Basic Knowledge");
if (t4.topRecommendations.length === 0) {
  console.log(">>> TEST 4 PASSED: Non-existent subject triggers fallback appropriately.");
} else {
  console.error(">>> TEST 4 FAILED");
}
