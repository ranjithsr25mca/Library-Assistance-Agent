/**
 * AI Library Assistance Agent - Frontend Controller
 * Connects to OpenRouter LLM backend (/api/recommend)
 * Renders dynamic AI-generated recommendations, scoring, and comparison table.
 */

(function () {
  "use strict";

  let catalogue = [];

  /**
   * Initialize App and Check API Status
   */
  async function initApp() {
    setupEventListeners();
    await checkApiStatus();
    await loadCatalogueStats();
  }

  /**
   * Check Backend & OpenRouter API Key Status
   */
  async function checkApiStatus() {
    const statusPill = document.getElementById("api-status-badge");
    const warningBanner = document.getElementById("api-warning-banner");

    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        if (statusPill) {
          if (data.hasApiKey) {
            statusPill.innerHTML = `<span class="pulse-dot green"></span> OpenRouter LLM Active (${escapeHtml(data.model)})`;
            statusPill.classList.add("active");
            statusPill.classList.remove("pending");
            if (warningBanner) warningBanner.style.display = "none";
          } else {
            statusPill.innerHTML = `<span class="pulse-dot amber"></span> OpenRouter Key Needed in .env`;
            statusPill.classList.add("pending");
            statusPill.classList.remove("active");
            if (warningBanner) warningBanner.style.display = "block";
          }
        }
      }
    } catch (e) {
      console.warn("Could not reach /api/status. Running in local preview mode.", e);
    }
  }

  /**
   * Load Catalogue stats
   */
  async function loadCatalogueStats() {
    try {
      const res = await fetch("books.json");
      if (res.ok) {
        catalogue = await res.json();
        const statsEl = document.getElementById("catalogue-count");
        if (statsEl) statsEl.textContent = catalogue.length;
      }
    } catch (e) {
      console.warn("Could not fetch books.json count", e);
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    const form = document.getElementById("recommendation-form");
    const resetBtn = document.getElementById("reset-btn");
    const chips = document.querySelectorAll(".subject-chip");

    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", handleReset);
    }

    // Quick subject suggestion chips
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const subjectInput = document.getElementById("subject-input");
        if (subjectInput) {
          subjectInput.value = chip.getAttribute("data-subject") || chip.textContent.trim();
          subjectInput.focus();
        }
      });
    });

    // Form Difficulty Cards Sync
    const diffInputs = document.querySelectorAll('input[name="difficulty"]');
    diffInputs.forEach(radio => {
      radio.addEventListener("change", () => {
        document.querySelectorAll(".difficulty-option").forEach(card => card.classList.remove("selected"));
        radio.closest(".difficulty-option")?.classList.add("selected");
      });
    });

    // Purpose Cards Sync
    const purposeInputs = document.querySelectorAll('input[name="purpose"]');
    purposeInputs.forEach(radio => {
      radio.addEventListener("change", () => {
        document.querySelectorAll(".purpose-option").forEach(card => card.classList.remove("selected"));
        radio.closest(".purpose-option")?.classList.add("selected");
      });
    });
  }

  /**
   * Handle Form Submission & Trigger OpenRouter LLM Call
   */
  async function handleFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const subjectInput = document.getElementById("subject-input").value.trim();
    const difficultyInput = document.querySelector('input[name="difficulty"]:checked')?.value;
    const purposeInput = document.querySelector('input[name="purpose"]:checked')?.value;

    if (!subjectInput) {
      alert("Please enter a subject to find books.");
      document.getElementById("subject-input").focus();
      return;
    }

    if (!difficultyInput) {
      alert("Please select a difficulty level (Beginner, Intermediate, or Advanced).");
      return;
    }

    if (!purposeInput) {
      alert("Please select your learning purpose.");
      return;
    }

    // Show Loading Spinner & Disable Button
    setLoadingState(true);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectInput,
          difficulty: difficultyInput,
          purpose: purposeInput
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to retrieve recommendations.`);
      }

      // Render Dynamic LLM Results
      renderResults({
        inputs: { subject: subjectInput, difficulty: difficultyInput, purpose: purposeInput },
        modelUsed: result.modelUsed,
        data: result.data
      });

    } catch (err) {
      console.error("Recommendation Error:", err);
      showErrorMessage(err.message);
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Toggle Loading State
   */
  function setLoadingState(isLoading) {
    const submitBtn = document.getElementById("find-books-btn");
    const loadingOverlay = document.getElementById("loading-state");
    const resultsContainer = document.getElementById("results-section");

    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading 
        ? `<span class="spinner"></span> <span>Analyzing with LLM...</span>` 
        : `<span class="btn-sparkle">✦</span> <span>Find Recommended Books</span>`;
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = isLoading ? "flex" : "none";
      if (isLoading) {
        loadingOverlay.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    if (isLoading && resultsContainer) {
      resultsContainer.style.display = "none";
    }
  }

  /**
   * Display Error Banner
   */
  function showErrorMessage(msg) {
    const errorBox = document.getElementById("error-notification");
    const errorText = document.getElementById("error-text");

    if (errorBox && errorText) {
      errorText.innerHTML = escapeHtml(msg);
      errorBox.style.display = "block";
      errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      alert(msg);
    }
  }

  /**
   * Reset Form & Clean UI
   */
  function handleReset() {
    document.getElementById("recommendation-form").reset();
    document.querySelectorAll(".difficulty-option").forEach(card => card.classList.remove("selected"));
    document.querySelectorAll(".purpose-option").forEach(card => card.classList.remove("selected"));

    const defaultDiff = document.querySelector('input[name="difficulty"][value="Beginner"]');
    if (defaultDiff) {
      defaultDiff.checked = true;
      defaultDiff.closest(".difficulty-option")?.classList.add("selected");
    }

    const defaultPurpose = document.querySelector('input[name="purpose"][value="Exam Preparation"]');
    if (defaultPurpose) {
      defaultPurpose.checked = true;
      defaultPurpose.closest(".purpose-option")?.classList.add("selected");
    }

    const resultsContainer = document.getElementById("results-section");
    const emptyState = document.getElementById("initial-state");
    const errorBox = document.getElementById("error-notification");

    if (resultsContainer) resultsContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    if (errorBox) errorBox.style.display = "none";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Render Dynamic LLM Results
   */
  function renderResults({ inputs, modelUsed, data }) {
    const initialState = document.getElementById("initial-state");
    const resultsContainer = document.getElementById("results-section");
    const errorBox = document.getElementById("error-notification");

    if (errorBox) errorBox.style.display = "none";
    if (initialState) initialState.style.display = "none";
    if (resultsContainer) {
      resultsContainer.style.display = "block";
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const hasMatches = data.hasMatches !== false && Array.isArray(data.topRecommendations) && data.topRecommendations.length > 0;

    // Render Query Summary Banner
    renderQuerySummary(inputs, modelUsed, hasMatches ? data.topRecommendations.length : 0);

    // If no matches found in catalogue
    if (!hasMatches) {
      renderNoMatchesView(inputs, data.fallback);
      return;
    }

    // Display standard recommendation views
    document.getElementById("no-matches-container").style.display = "none";
    document.getElementById("recommendations-container").style.display = "block";
    document.getElementById("comparison-container").style.display = "block";

    // 1. Render Top Recommendations Cards
    renderRecommendationCards(data.topRecommendations, inputs);

    // 2. Render Comparison Table
    renderComparisonTable(data.comparisonTable || data.topRecommendations, inputs);
  }

  /**
   * Render Query Summary Header
   */
  function renderQuerySummary(inputs, modelUsed, count) {
    const banner = document.getElementById("query-summary-banner");
    if (!banner) return;

    banner.innerHTML = `
      <div class="summary-info">
        <div class="summary-title">
          <span class="pulse-indicator"></span>
          AI Recommendation Results (${escapeHtml(modelUsed || "OpenRouter LLM")})
        </div>
        <div class="summary-tags">
          <span class="tag-pill tag-subject">📚 Subject: <strong>${escapeHtml(inputs.subject)}</strong></span>
          <span class="tag-pill tag-difficulty">🎯 Level: <strong>${escapeHtml(inputs.difficulty)}</strong></span>
          <span class="tag-pill tag-purpose">🎯 Goal: <strong>${escapeHtml(inputs.purpose)}</strong></span>
        </div>
      </div>
      <div class="summary-metric">
        <div class="metric-number">${count}</div>
        <div class="metric-label">Recommended Books</div>
      </div>
    `;
  }

  /**
   * Render Top 3 Recommendation Cards
   */
  function renderRecommendationCards(recommendations, inputs) {
    const container = document.getElementById("recommendations-grid");
    if (!container) return;

    container.innerHTML = "";

    const rankLabels = [
      { badge: "1st Choice • Best Match", class: "rank-gold" },
      { badge: "2nd Choice • Highly Recommended", class: "rank-silver" },
      { badge: "3rd Choice • Strong Alternative", class: "rank-bronze" }
    ];

    recommendations.forEach((book, index) => {
      const rank = rankLabels[index] || { badge: `#${index + 1} Recommendation`, class: "rank-standard" };
      const card = document.createElement("div");
      card.className = `recommendation-card ${rank.class}`;
      card.id = `recommended-book-${book.id || index}`;

      const highlights = Array.isArray(book.highlights) ? book.highlights : [];
      const highlightsHtml = highlights.map(h => `<li><span class="check-icon">✓</span> ${escapeHtml(h)}</li>`).join("");

      const score = Math.round(book.relevanceScore || 90);

      card.innerHTML = `
        <div class="card-badge-header">
          <span class="rank-badge">${rank.badge}</span>
          <div class="score-badge" title="Dynamic AI Suitability Score">
            <span class="score-value">${score}%</span>
            <span class="score-label">Match</span>
          </div>
        </div>

        <div class="card-body">
          <div class="book-subject-tag">${escapeHtml(book.subject || inputs.subject)}</div>
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-author">by <strong>${escapeHtml(book.author || "Author")}</strong></p>

          <div class="card-meta-chips">
            <span class="meta-chip chip-diff ${(book.difficulty || "beginner").toLowerCase()}">
              <span class="dot"></span> ${escapeHtml(book.difficulty || inputs.difficulty)}
            </span>
            <span class="meta-chip chip-purpose">
              🎯 ${escapeHtml(book.learningPurposeFit || inputs.purpose)}
            </span>
            <span class="meta-chip chip-rating">
              ★ ${book.rating || "4.8"} / 5.0
            </span>
          </div>

          <p class="book-description">${escapeHtml(book.description || "")}</p>

          <div class="ai-recommendation-box">
            <div class="ai-box-header">
              <span class="ai-sparkle">✦</span> LLM Recommendation Rationale:
            </div>
            <p class="ai-box-reason">${escapeHtml(book.recommendationReason || "")}</p>
          </div>

          ${highlightsHtml ? `
            <div class="book-highlights">
              <div class="highlights-title">Key Highlights:</div>
              <ul class="highlights-list">${highlightsHtml}</ul>
            </div>
          ` : ""}
        </div>
      `;

      container.appendChild(card);
    });
  }

  /**
   * Render Comparison Table
   */
  function renderComparisonTable(tableData, inputs) {
    const tableBody = document.getElementById("comparison-table-body");
    const compCount = document.getElementById("comparison-count");
    if (!tableBody) return;

    if (compCount) {
      compCount.textContent = `${tableData.length} candidates evaluated`;
    }

    tableBody.innerHTML = "";

    tableData.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.className = index < 3 ? "highlight-top-row" : "";

      const score = Math.round(row.relevanceScore || 85);
      const progressColor = score >= 85 ? "var(--accent-green)" : score >= 70 ? "var(--accent-blue)" : "var(--accent-amber)";
      const diffClass = (row.difficulty || "").toLowerCase();

      let suitabilityClass = "suitability-optimal";
      if (score < 70) suitabilityClass = "suitability-moderate";
      else if (score < 85) suitabilityClass = "suitability-strong";

      tr.innerHTML = `
        <td class="col-rank">
          ${index < 3 ? `<span class="table-rank-badge top-${index + 1}">#${index + 1}</span>` : `<span class="table-rank-badge standard">${index + 1}</span>`}
        </td>
        <td class="col-book">
          <div class="table-book-title">${escapeHtml(row.title)}</div>
          <div class="table-book-author">by ${escapeHtml(row.author || "")}</div>
        </td>
        <td class="col-subject">
          <span class="subject-badge">${escapeHtml(row.subject || inputs.subject)}</span>
        </td>
        <td class="col-diff">
          <span class="diff-tag ${diffClass}">${escapeHtml(row.difficulty || "")}</span>
          <div class="status-subtext">${escapeHtml(row.difficultyFit || "Evaluated")}</div>
        </td>
        <td class="col-purpose">
          <span class="purpose-tag">${escapeHtml(row.purposeFit || row.learningPurposeFit || inputs.purpose)}</span>
        </td>
        <td class="col-score">
          <div class="score-display-wrapper">
            <div class="score-num">${score}%</div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${score}%; background-color: ${progressColor};"></div>
            </div>
          </div>
        </td>
        <td class="col-verdict">
          <span class="verdict-badge ${suitabilityClass}">${escapeHtml(row.suitabilityTier || "Recommended")}</span>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  /**
   * Render No Matches View with Smart Subject Suggestions
   */
  function renderNoMatchesView(inputs, fallbackData) {
    document.getElementById("recommendations-container").style.display = "none";
    document.getElementById("comparison-container").style.display = "none";

    const noMatchesContainer = document.getElementById("no-matches-container");
    if (!noMatchesContainer) return;

    noMatchesContainer.style.display = "block";

    const suggested = fallbackData?.suggestedSubjects || ["Python", "Cloud Computing", "Artificial Intelligence", "Cybersecurity", "Database Management"];
    const explanation = fallbackData?.explanation || `No direct matches for "${inputs.subject}" were found in our current computer science catalogue.`;

    noMatchesContainer.innerHTML = `
      <div class="no-matches-card">
        <div class="no-matches-icon">🔍</div>
        <h3 class="no-matches-title">No Exact Books Found for "${escapeHtml(inputs.subject)}"</h3>
        <p class="no-matches-desc">${escapeHtml(explanation)}</p>

        <div class="suggested-subjects-section">
          <h4>Try selecting an available subject recommended by the AI:</h4>
          <div class="suggested-chips-grid">
            ${suggested.map(subj => `
              <button type="button" class="fallback-subject-btn" data-subject="${escapeHtml(subj)}">
                <span>📚</span> ${escapeHtml(subj)}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="no-matches-actions">
          <button type="button" id="retry-search-btn" class="primary-btn">
            Try Another Search
          </button>
        </div>
      </div>
    `;

    const fallbackBtns = noMatchesContainer.querySelectorAll(".fallback-subject-btn");
    fallbackBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const selectedSubj = btn.getAttribute("data-subject");
        const subjectInput = document.getElementById("subject-input");
        if (subjectInput && selectedSubj) {
          subjectInput.value = selectedSubj;
          document.getElementById("recommendation-form").dispatchEvent(new Event("submit"));
        }
      });
    });

    const retryBtn = document.getElementById("retry-search-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        const subjectInput = document.getElementById("subject-input");
        if (subjectInput) {
          subjectInput.value = "";
          subjectInput.focus();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Load app when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
