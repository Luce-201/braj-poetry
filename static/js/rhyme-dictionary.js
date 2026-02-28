// ============================================
// Braj Kavya Kosha — Rhyme Dictionary Engine
// Corpus-first, auto-depth Devanagari matching
// ============================================

(function () {
  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const inputEl      = document.getElementById('rd-input');
  const clearBtn     = document.getElementById('rd-clear');
  const resultsEl    = document.getElementById('rd-results');
  const statsEl      = document.getElementById('rd-stats');
  const emptyEl      = document.getElementById('rd-empty');
  const noResultsEl  = document.getElementById('rd-no-results');
  const noResultsTxt = document.getElementById('rd-no-results-text');
  const depthBar     = document.getElementById('rd-depth-bar');
  const depthPills   = document.getElementById('rd-depth-pills');

  if (!inputEl) return;

  // ── Config ───────────────────────────────────────────────────────────────────
  const MIN_WORD_LEN    = 2;   // minimum chars for a word to be indexed
  const MIN_SUFFIX_CHARS = 2;  // minimum suffix chars for rhyme matching
  const MAX_SUFFIX_CHARS = 6;  // maximum suffix chars considered
  const MIN_RHYMES_FOR_DEPTH = 2; // minimum matches to accept a depth level

  // ── DEVANAGARI UTILITIES ─────────────────────────────────────────────────────

  // Strip punctuation common in Braj poetry, normalise
  function cleanWord(word) {
    return word
      .replace(/[।,.!?;:""''॥–—\-\u200c\u200d\ufeff]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  // Tokenise text into Devanagari word tokens
  function tokenise(text) {
    // Split on whitespace and non-Devanagari characters
    // Keep only tokens that are predominantly Devanagari
    const tokens = text.split(/[\s\n\r]+/);
    const words = [];
    for (const tok of tokens) {
      const w = cleanWord(tok);
      // Must contain at least one Devanagari character
      if (w.length >= MIN_WORD_LEN && /[\u0900-\u097F]/.test(w)) {
        words.push(w);
      }
    }
    return words;
  }

  // Extract the phonetic "rhyme unit" suffix of a Devanagari word.
  // In Devanagari, a single "character slot" may be a base consonant,
  // a vowel sign (matra), anusvara, visarga, etc.
  // We work at the Unicode code-point level and extract the last N
  // "syllable clusters" (virama-joined consonants + matras count as one unit).
  function getDevanagariSuffix(word, chars) {
    // Build array of syllable clusters
    const clusters = splitIntoClusters(word);
    if (clusters.length === 0) return '';
    // Take last `chars` clusters
    const taken = clusters.slice(Math.max(0, clusters.length - chars));
    return taken.join('');
  }

  // Split a Devanagari string into syllable clusters.
  // A cluster = (optional preceding halant+consonant)* + base char + (matras | anusvara | visarga)*
  function splitIntoClusters(word) {
    const VIRAMA   = '\u094D'; // halant ्
    const ANUSVARA = '\u0902'; // ं
    const VISARGA  = '\u0903'; // ः
    const CHANDRABINDU = '\u0901'; // ँ
    const NUKTA    = '\u093C'; // ़
    // Vowel signs / matras: \u093E–\u094C + \u094E\u094F
    const isMatra = c => (c >= '\u093E' && c <= '\u094C') || c === '\u094E' || c === '\u094F';
    const isDiacritic = c => c === ANUSVARA || c === VISARGA || c === CHANDRABINDU || c === NUKTA;

    const chars = [...word]; // spread to handle surrogate pairs
    const clusters = [];
    let i = 0;

    while (i < chars.length) {
      let cluster = chars[i];
      i++;
      // Consume virama + next consonant(s) (conjuncts)
      while (i < chars.length && chars[i] === VIRAMA && i + 1 < chars.length) {
        cluster += chars[i] + chars[i + 1];
        i += 2;
      }
      // Consume matras and diacritics attached to this cluster
      while (i < chars.length && (isMatra(chars[i]) || isDiacritic(chars[i]))) {
        cluster += chars[i];
        i++;
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  // ── BUILD CORPUS INDEX ───────────────────────────────────────────────────────
  // Map: word → [{title, url, poet}]
  const wordIndex = new Map(); // word → Set of poem refs

  function buildIndex() {
    const corpus = window.BRAJ_CORPUS || [];
    for (const poem of corpus) {
      const words = tokenise(poem.text + ' ' + poem.title);
      const ref = { title: poem.title, url: poem.url, poet: poem.poet };
      for (const w of words) {
        if (!wordIndex.has(w)) wordIndex.set(w, []);
        // Avoid duplicate poem refs
        const refs = wordIndex.get(w);
        if (!refs.find(r => r.url === poem.url)) {
          refs.push(ref);
        }
      }
    }
  }

  buildIndex();

  // ── AUTO-DETECT RHYME DEPTH ──────────────────────────────────────────────────
  // Strategy: try suffix lengths from MAX down to MIN.
  // Pick the longest suffix that yields ≥ MIN_RHYMES_FOR_DEPTH matches
  // (excluding the query word itself). If nothing passes threshold, use 2.

  function autoDetectDepth(queryWord) {
    for (let depth = MAX_SUFFIX_CHARS; depth >= MIN_SUFFIX_CHARS; depth--) {
      const suffix = getDevanagariSuffix(queryWord, depth);
      if (!suffix) continue;
      const matches = findRhymes(queryWord, suffix);
      if (matches.length >= MIN_RHYMES_FOR_DEPTH) return depth;
    }
    return MIN_SUFFIX_CHARS;
  }

  // ── FIND RHYMES ──────────────────────────────────────────────────────────────
  function findRhymes(queryWord, suffix) {
    const results = [];
    for (const [word, refs] of wordIndex.entries()) {
      if (word === queryWord) continue; // exclude exact query
      const wordSuffix = getDevanagariSuffix(word, splitIntoClusters(suffix).length);
      if (wordSuffix === suffix) {
        results.push({ word, refs, suffix });
      }
    }
    // Sort: words where suffix is a bigger proportion of the word come first
    // (purer rhymes), then alphabetically
    results.sort((a, b) => {
      const aRatio = splitIntoClusters(a.suffix).length / splitIntoClusters(a.word).length;
      const bRatio = splitIntoClusters(b.suffix).length / splitIntoClusters(b.word).length;
      if (Math.abs(aRatio - bRatio) > 0.05) return bRatio - aRatio;
      return a.word.localeCompare(b.word);
    });
    return results;
  }

  // Gather available depths (those with ≥1 result)
  function getAvailableDepths(queryWord) {
    const depths = [];
    for (let depth = MIN_SUFFIX_CHARS; depth <= MAX_SUFFIX_CHARS; depth++) {
      const suffix = getDevanagariSuffix(queryWord, depth);
      if (!suffix) break;
      const matches = findRhymes(queryWord, suffix);
      if (matches.length > 0) {
        depths.push({ depth, suffix, count: matches.length });
      }
    }
    return depths;
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  let currentDepth   = null;
  let currentQuery   = '';
  let availableDepths = [];

  function highlightSuffix(word, suffix) {
    if (!suffix || !word.endsWith(suffix)) {
      return `<span>${escapeHtml(word)}</span>`;
    }
    const stem = word.slice(0, word.length - suffix.length);
    return `<span>${escapeHtml(stem)}<span class="rhyme-suffix">${escapeHtml(suffix)}</span></span>`;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderDepthPills(queryWord) {
    availableDepths = getAvailableDepths(queryWord);
    depthPills.innerHTML = availableDepths.map(({ depth, suffix, count }) => `
      <button
        class="rd-depth-pill${depth === currentDepth ? ' active' : ''}"
        data-depth="${depth}"
        title="Match on last ${depth} syllable clusters"
      >
        ${escapeHtml(suffix)}
        <span class="pill-count">${count}</span>
      </button>
    `).join('');

    depthPills.querySelectorAll('.rd-depth-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDepth = parseInt(btn.dataset.depth, 10);
        renderResults(currentQuery);
        // Update active state
        depthPills.querySelectorAll('.rd-depth-pill').forEach(b =>
          b.classList.toggle('active', parseInt(b.dataset.depth,10) === currentDepth)
        );
      });
    });

    depthBar.style.display = availableDepths.length > 0 ? 'flex' : 'none';
  }

  function renderResults(queryWord) {
    if (!queryWord) { showEmpty(); return; }

    const suffix  = getDevanagariSuffix(queryWord, currentDepth);
    const results = findRhymes(queryWord, suffix);

    if (results.length === 0) {
      resultsEl.innerHTML = '';
      statsEl.innerHTML = '';
      noResultsTxt.textContent = `"${queryWord}" की तुक नहीं मिली`;
      noResultsEl.classList.remove('hidden');
      emptyEl.classList.add('hidden');
      return;
    }

    noResultsEl.classList.add('hidden');
    emptyEl.classList.add('hidden');

    // Stats
    const clusterCount = splitIntoClusters(suffix).length;
    statsEl.innerHTML = `
      <span>${results.length} तुक मिली / ${results.length} rhyme${results.length !== 1 ? 's' : ''} found</span>
      <span style="margin:0 0.5rem;opacity:0.4">·</span>
      <span>suffix <strong style="color:var(--gold-dim);font-family:var(--font-hi)">${escapeHtml(suffix)}</strong> (${clusterCount} cluster${clusterCount !== 1 ? 's' : ''})</span>
    `;

    // Group by exact ending for visual clarity
    const groups = new Map();
    for (const r of results) {
      const key = r.suffix;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    let html = '';
    for (const [ending, words] of groups.entries()) {
      html += `
        <div class="rd-group">
          <div class="rd-group-heading">
            <span class="group-ending">${escapeHtml(ending)}</span>
            <span class="rd-group-count">${words.length}</span>
          </div>
          ${words.map(({ word, refs }) => `
            <div class="rd-card">
              <div class="rd-card-accent"></div>
              <div class="rd-card-body">
                <div class="rd-card-left">
                  <div class="rd-word">${highlightSuffix(word, ending)}</div>
                  <div class="rd-sources">
                    ${refs.map(ref => `
                      <a href="${ref.url}" class="rd-source-tag" title="${escapeHtml(ref.title)}">
                        ${escapeHtml(truncate(ref.title, 22))}
                        ${ref.poet ? `<span class="poet-name">— ${escapeHtml(ref.poet)}</span>` : ''}
                      </a>
                    `).join('')}
                  </div>
                </div>
                <div class="rd-card-right">
                  <span class="rd-ending-badge">${escapeHtml(ending)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    resultsEl.innerHTML = html;
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function showEmpty() {
    resultsEl.innerHTML = '';
    statsEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    noResultsEl.classList.add('hidden');
    depthBar.style.display = 'none';
  }

  // ── SEARCH FLOW ──────────────────────────────────────────────────────────────
  let debounceTimer = null;

  function runSearch(raw) {
    const query = cleanWord(raw.trim());
    currentQuery = query;

    clearBtn.style.display = raw.length > 0 ? 'flex' : 'none';

    if (!query || !/[\u0900-\u097F]/.test(query)) {
      showEmpty();
      return;
    }

    // Auto-detect depth
    currentDepth = autoDetectDepth(query);

    // Render depth pills (lets user override)
    renderDepthPills(query);

    // Render with auto-detected depth
    renderResults(query);
  }

  // ── EVENTS ───────────────────────────────────────────────────────────────────
  inputEl.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(this.value), 120);
  });

  clearBtn.addEventListener('click', function () {
    inputEl.value = '';
    inputEl.focus();
    showEmpty();
    this.style.display = 'none';
  });

  // Example chips
  document.querySelectorAll('.rd-example-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      inputEl.value = this.dataset.word;
      inputEl.focus();
      runSearch(this.dataset.word);
    });
  });

  // URL param support
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    inputEl.value = q;
    runSearch(q);
  }

})();
