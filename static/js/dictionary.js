// ============================================
// Braj Awadhi Kavyalok — Dictionary v2
// Morphological lookup engine for Hindi, Braj & Awadhi
// Handles: noun inflections, diminutives, verb conjugations,
//          matra/anusvara variants, Braj/Awadhi dialect forms
// ============================================

const raw = window.BRAJ_DICTIONARY || '{}';
const dictionary = typeof raw === 'string' ? JSON.parse(raw) : raw;

// ─── Normalization ───────────────────────────────────────────────────────────
// Strip invisible joiners; unify chandrabindu ँ → anusvara ं for matching
function normalize(word) {
  return word
    .replace(/[\u200C\u200D]/g, '')   // ZWNJ, ZWJ
    .replace(/\u0901/g, '\u0902')     // chandrabindu ँ → anusvara ं
    .trim();
}

// ─── Direct lookup helper ────────────────────────────────────────────────────
function dictLookup(w) {
  return dictionary[w] || dictionary[normalize(w)] || null;
}

// ─── Suffix tables (longest first within each group) ────────────────────────

// 1. Postpositions / case markers — strip and try the naked stem
const CASE_SUFFIXES = [
  'के लिए', 'के साथ', 'की ओर',   // phrasal postpositions (rare but possible)
  'ियों', 'ियाँ', 'ियां', 'ियो',  // oblique plural of -iya nouns
  'ाओं', 'ओं',                    // oblique plural
  'ाँ', 'ां',                     // nasal plural (feminine)
  'ों',                           // oblique plural
  'ने', 'को', 'से', 'में', 'पर',
  'के', 'की', 'का',
  'ये', 'यें', 'यों',
  'ें', 'ए', 'ी', 'ा', 'े',
];

// 2. Braj/Awadhi/Hindi noun & adjective derivational suffixes
//    Each entry: [suffix, replacement_to_try, note]
//    'replacement' is appended to the stripped stem before dict lookup
const NOUN_RULES = [
  // ── Braj diminutive/affectionate: आँख → आँखिया ──
  ['इयाँ', '',  'बहुवचन (ब्रज)'],
  ['इयां', '',  'बहुवचन (ब्रज)'],
  ['इयों', '',  'कारक-बहुवचन (ब्रज)'],
  ['इयो',  '',  'बहुवचन (ब्रज)'],
  ['इया',  '',  'लघुरूप (ब्रज)'],   // आँखिया → आँख
  // also try with ा ending (some nouns end in ā)
  ['इया',  'ा', 'लघुरूप (ब्रज)'],   // बतिया → बात

  // ── Awadhi diminutive with -वा ──
  ['वाँ',  '',  'लघुरूप (अवधी)'],
  ['वा',   '',  'लघुरूप (अवधी)'],

  // ── Abstract noun suffixes ──
  ['पना',  '',  'भाववाचक'],          // अपनापना → अपना
  ['पन',   '',  'भाववाचक'],          // बचपन → बच्चा (imperfect but tries)
  ['ाई',   '',  'भाववाचक'],          // भलाई → भला, बुराई → बुरा
  ['ाहट',  '',  'भाववाचक'],          // घबराहट → घबरा
  ['ावट',  '',  'भाववाचक'],          // सजावट → सजा
  ['ता',   '',  'भाववाचक'],          // सुंदरता → सुंदर

  // ── Agentive / relational ──
  ['हारा', '',  'कर्तृवाचक'],
  ['हारी', '',  'कर्तृवाचक'],
  ['हारे', '',  'कर्तृवाचक'],
  ['वाला', '',  'संबंधवाचक'],
  ['वाली', '',  'संबंधवाचक'],
  ['वाले', '',  'संबंधवाचक'],

  // ── Adjective agreement (gender/number) ──
  ['ीला',  '',  'विशेषण'],
  ['ीली',  '',  'विशेषण'],
  ['ीले',  '',  'विशेषण'],
];

// 3. Verb conjugation rules: [suffix, replacement, note]
//    replacement is appended to stem → try stem+repl in dictionary
//    Try with both 'ना' infinitive and bare root
const VERB_RULES = [
  // ── Standard Hindi Future ──
  ['एगा',   'ना', 'भविष्यकाल'],
  ['एगी',   'ना', 'भविष्यकाल'],
  ['एंगे',  'ना', 'भविष्यकाल'],
  ['ेगा',   'ना', 'भविष्यकाल'],
  ['ेगी',   'ना', 'भविष्यकाल'],
  ['ेंगे',  'ना', 'भविष्यकाल'],
  ['ेगे',   'ना', 'भविष्यकाल'],

  // ── Present/past habitual ──
  ['ता था',  'ना', 'सामान्य भूत'],
  ['ती थी',  'ना', 'सामान्य भूत'],
  ['ते थे',  'ना', 'सामान्य भूत'],
  ['ता है',  'ना', 'वर्तमान'],
  ['ती है',  'ना', 'वर्तमान'],
  ['ते हैं', 'ना', 'वर्तमान'],
  ['ता हूँ', 'ना', 'वर्तमान'],
  ['ती हूँ', 'ना', 'वर्तमान'],

  // ── Present participle -ता/-ती/-ते → infinitive ──
  ['ाता', 'ाना', 'क्रिया-विशेषण'],
  ['ाती', 'ाना', 'क्रिया-विशेषण'],
  ['ाते', 'ाना', 'क्रिया-विशेषण'],
  ['ता',  'ना',  'क्रिया-विशेषण'],
  ['ती',  'ना',  'क्रिया-विशेषण'],
  ['ते',  'ना',  'क्रिया-विशेषण'],

  // ── Conjunctive participle -कर ──
  ['कर', '', 'पूर्वकालिक क्रिया'],

  // ── Perfective / past participle ──
  ['ाया', 'ाना', 'भूतकाल'],
  ['ाई',  'ाना', 'भूतकाल'],
  ['ाए',  'ाना', 'भूतकाल'],
  ['आया', 'आना', 'भूतकाल'],
  ['आई',  'आना', 'भूतकाल'],
  ['आए',  'आना', 'भूतकाल'],

  // ── Infinitive → root ──
  ['ाना', 'ा',  'मूल क्रिया'],    // जाना → जा, खाना → खा
  ['ना',  '',   'मूल क्रिया'],    // चलना → चल, देखना → देख

  // ── Imperative ──
  ['िए',   '', 'आज्ञार्थ'],
  ['िये',  '', 'आज्ञार्थ'],
  ['इए',   '', 'आज्ञार्थ'],
  ['ो',    '', 'आज्ञार्थ'],

  // ── Subjunctive / hortative ──
  ['ूँ',  'ना', 'संभावनार्थ'],
  ['ें',  'ना', 'संभावनार्थ'],
  ['ए',   'ना', 'संभावनार्थ'],

  // ── Braj/Awadhi present participle -त/-ति/-तो ──
  ['ावतीं', 'ाना', 'वर्तमान (ब्रज)'],
  ['ावती',  'ाना', 'वर्तमान (ब्रज)'],
  ['ावत',   'ाना', 'वर्तमान (ब्रज)'],   // गावत → गाना
  ['ातीं',  'ाना', 'वर्तमान (ब्रज)'],
  ['ाती',   'ाना', 'वर्तमान (ब्रज)'],
  ['ात',    'ाना', 'वर्तमान (ब्रज)'],
  ['तीं',   'ना',  'वर्तमान (ब्रज)'],
  ['ति',    'ना',  'वर्तमान (ब्रज)'],   // चलति → चलना
  ['तो',    'ना',  'वर्तमान (ब्रज)'],
  ['त',     'ना',  'वर्तमान (ब्रज)'],   // जात → जाना, सुनत → सुनना

  // ── Braj past / perfect -यो/-यौ/-ई/-े ──
  ['ायो',  'ाना', 'भूतकाल (ब्रज)'],
  ['ायौ',  'ाना', 'भूतकाल (ब्रज)'],
  ['ाये',  'ाना', 'भूतकाल (ब्रज)'],
  ['ियो',  'ना',  'भूतकाल (ब्रज)'],    // देखियो → देखना
  ['यो',   'ना',  'भूतकाल (ब्रज)'],
  ['यौ',   'ना',  'भूतकाल (ब्रज)'],

  // ── Braj imperative -हु/-ौ/-ियो ──
  ['हु',   'ना', 'आज्ञार्थ (ब्रज)'],   // सुनहु → सुनना
  ['हू',   'ना', 'आज्ञार्थ (ब्रज)'],
  ['औ',    'ना', 'आज्ञार्थ (ब्रज)'],   // सुनौ → सुनना

  // ── Braj future -इहैं/-इहै/-इहो ──
  ['इहैं', '', 'भविष्यकाल (ब्रज)'],
  ['इहै',  '', 'भविष्यकाल (ब्रज)'],
  ['इहो',  '', 'भविष्यकाल (ब्रज)'],
  ['इहि',  '', 'भविष्यकाल (ब्रज)'],
  ['ैहो',  '', 'भविष्यकाल (ब्रज)'],
  ['ैहैं', '', 'भविष्यकाल (ब्रज)'],
  ['ैहै',  '', 'भविष्यकाल (ब्रज)'],

  // ── Awadhi infinitive -ब/-इब ──
  ['इबे',  'ना', 'भविष्य (अवधी)'],
  ['इबो',  'ना', 'भविष्य (अवधी)'],
  ['इब',   'ना', 'भविष्य (अवधी)'],    // जाइब → जाना
  ['ब',    'ना', 'भविष्य (अवधी)'],    // करब → करना

  // ── Awadhi causative -वा ──
  ['वावा',  'ाना', 'प्रेरणार्थक (अवधी)'],
  ['वाए',   'ाना', 'प्रेरणार्थक (अवधी)'],
  ['वाई',   'ाना', 'प्रेरणार्थक (अवधी)'],

  // ── Passive / causative -वाना/-लाना (standard) ──
  ['वाना', 'ना', 'प्रेरणार्थक'],
  ['लाना', 'ना', 'प्रेरणार्थक'],
  ['वाया', 'ना', 'प्रेरणार्थक'],
];

// ─── Stem candidate generator ────────────────────────────────────────────────
// Returns [{stem, note}, ...] in priority order, no duplicates
function getStemCandidates(word) {
  const seen = new Set();
  const candidates = [];

  const push = (stem, note) => {
    const s = normalize(stem);
    if (s.length > 1 && !seen.has(s)) {
      seen.add(s);
      candidates.push({ stem: s, note });
    }
  };

  // ── Pass 1: case suffixes ──────────────────────────────────────────────────
  for (const suf of CASE_SUFFIXES) {
    if (word.endsWith(suf) && word.length > suf.length + 1) {
      const stem = word.slice(0, -suf.length);
      push(stem, null);
      // For -ों, -ें: also try restoring ā ending (oblique of ā-stem nouns)
      if (suf === 'ों' || suf === 'ें') {
        push(stem + 'ा', null);
        push(stem + 'ी', null);
      }
    }
  }

  // ── Pass 2: noun/adjective derivational suffixes ──────────────────────────
  for (const [suf, repl, note] of NOUN_RULES) {
    if (word.endsWith(suf) && word.length > suf.length + 1) {
      const base = word.slice(0, -suf.length);
      push(base + repl, note);
      push(base, note);                   // also try bare stem
    }
  }

  // ── Pass 3: verb conjugation suffixes ─────────────────────────────────────
  for (const [suf, repl, note] of VERB_RULES) {
    if (word.endsWith(suf) && word.length > suf.length + 1) {
      const root = word.slice(0, -suf.length);
      push(root + repl, note);            // e.g. चल + ना = चलना
      push(root, note);                   // bare root: चल
      // For -ना infinitives, also try ā-ending (sometimes listed as such)
      if (repl === 'ना') push(root + 'ा', note);
    }
  }

  // ── Pass 4: matra / anusvara normalization variants ───────────────────────
  // These are tried on the original word as independent candidates
  const matraVariants = [
    word.replace(/ि/g, 'ी'),
    word.replace(/ी/g, 'ि'),
    word.replace(/ु/g, 'ू'),
    word.replace(/ू/g, 'ु'),
    word.replace(/ं/g, ''),             // drop anusvara
    word.replace(/ँ/g, ''),             // drop chandrabindu
    word.replace(/़/g, ''),             // drop nukta
    word.replace(/ा$/, ''),             // drop trailing ā
    word.replace(/ी$/, ''),             // drop trailing ī
  ];
  for (const v of matraVariants) {
    push(v, 'वर्तनी-भेद');
  }

  return candidates;
}

// ─── Main lookup ─────────────────────────────────────────────────────────────
function lookupWord(rawWord) {
  const word = normalize(rawWord);
  if (!word) return null;

  // 1. Exact match
  const direct = dictLookup(word);
  if (direct) return { meaning: direct, matchedRoot: null, gramNote: null };

  // 2. Try all stem candidates
  for (const { stem, note } of getStemCandidates(word)) {
    const m = dictLookup(stem);
    if (m) {
      return {
        meaning: m,
        matchedRoot: stem !== word ? stem : null,
        gramNote: note,
      };
    }
  }

  return null;
}

// ─── Tooltip UI ──────────────────────────────────────────────────────────────
function showTooltip(clickedWord, result) {
  const tooltip = document.getElementById('word-tooltip');
  if (!tooltip) return;

  const wordEl    = tooltip.querySelector('.tooltip-word');
  const meaningEl = tooltip.querySelector('.tooltip-meaning');
  const noteEl    = tooltip.querySelector('.tooltip-note');

  wordEl.textContent = clickedWord;
  meaningEl.textContent = result ? result.meaning : '(अर्थ उपलब्ध नहीं)';

  if (noteEl) {
    if (result && result.matchedRoot) {
      // e.g. "आँखिया → आँख  •  लघुरूप (ब्रज)"
      noteEl.textContent =
        `${clickedWord} → ${result.matchedRoot}` +
        (result.gramNote ? `  •  ${result.gramNote}` : '');
      noteEl.style.display = '';
    } else {
      noteEl.textContent = '';
      noteEl.style.display = 'none';
    }
  }

  tooltip.classList.remove('hidden');
}

function closeTooltip() {
  const t = document.getElementById('word-tooltip');
  if (t) t.classList.add('hidden');
}

// ─── Word click handler ───────────────────────────────────────────────────────
function onWordClick(event) {
  const word = event.target.dataset.word;
  if (!word) return;
  event.stopPropagation();
  const result = lookupWord(word);
  showTooltip(word, result);
}

// ─── Make poem words clickable ────────────────────────────────────────────────
function makePoemWordsClickable() {
  const poemBody = document.getElementById('poem-text');
  if (!poemBody) return;

  const walker = document.createTreeWalker(
    poemBody,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    const text = node.textContent;
    const parent = node.parentNode;
    if (['A', 'H1', 'H2', 'H3', 'BUTTON'].includes(parent.tagName)) return;

    const fragment = document.createDocumentFragment();
    const parts = text.split(/(\s+)/);

    parts.forEach(part => {
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
      } else {
        // Strip punctuation for the data-word attribute but keep original text
        const cleanWord = part.replace(/[।,;:!?""''।॥।·\-]/g, '').trim();
        const span = document.createElement('span');
        span.textContent = part;
        span.className = 'poem-word';
        span.dataset.word = cleanWord;
        span.addEventListener('click', onWordClick);
        fragment.appendChild(span);
      }
    });

    parent.replaceChild(fragment, node);
  });
}

// ─── Global close handlers ────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('poem-word') &&
      !e.target.closest('#word-tooltip')) {
    closeTooltip();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeTooltip();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', makePoemWordsClickable);