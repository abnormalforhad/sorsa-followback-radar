import './style.css';

// ─── Sorsa API Client ─────────────────────────────────
const BASE_URL = 'https://api.sorsa.io/v3';

class SorsaAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestsUsed = 0;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const res = await fetch(url.toString(), {
      headers: { 'ApiKey': this.apiKey }
    });

    this.requestsUsed++;

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `API error ${res.status}`);
    }

    return res.json();
  }

  async getUserProfile(username) {
    return this.request('/info', { username });
  }

  async getUserProfileBatch(usernames) {
    const url = new URL(`${BASE_URL}/info-batch`);
    usernames.forEach(u => url.searchParams.append('usernames', u));

    const res = await fetch(url.toString(), {
      headers: { 'ApiKey': this.apiKey }
    });
    this.requestsUsed++;
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `API error ${res.status}`);
    }
    return res.json();
  }

  async getScore(username) {
    return this.request('/score', { username });
  }

  async getFollowerStats(username) {
    return this.request('/followers-stats', { username });
  }

  async getTopFollowers(username) {
    return this.request('/top-followers', { username });
  }

  async getTopFollowing(username) {
    return this.request('/top-following', { username });
  }

  async getFollowers(username, cursor) {
    const params = { username };
    if (cursor) params.next_cursor = cursor;
    return this.request('/followers', params);
  }

  async getUsage() {
    return this.request('/key-usage-info');
  }
}


// ─── Curated Seed Pools & Presets ───────────────────────
const SEED_PRESETS = {
  web3: {
    label: '⚡ Web3 / Crypto',
    handles: ['VitalikButerin', 'balajis', 'brian_armstrong', 'haydenzadams', 'sassal0x', 'cz_binance']
  },
  ai: {
    label: '🤖 AI & Tech',
    handles: ['sama', 'ylecun', 'karpathy', 'demishassabis', 'gdb', 'drfeifei']
  },
  founders: {
    label: '🚀 Founders',
    handles: ['naval', 'paulg', 'levelsio', 'shl', 'tobi', 'dhh']
  },
  vcs: {
    label: '💎 VCs & Angels',
    handles: ['pmarca', 'cdixon', 'garrytan', 'eladgil', 'packyM', 'jason']
  }
};

const ALL_CURATED_SEEDS = [
  'VitalikButerin', 'balajis', 'brian_armstrong', 'haydenzadams', 'sassal0x', 'cz_binance',
  'sama', 'ylecun', 'karpathy', 'demishassabis', 'gdb', 'drfeifei', 'AndrewYNg',
  'naval', 'paulg', 'levelsio', 'shl', 'tobi', 'dhh', 'patio11',
  'pmarca', 'cdixon', 'garrytan', 'eladgil', 'packyM', 'jason',
  'dickiebush', 'thealexbanks', 'SahilBloom', 'TrungTPhan', 'garrytan', 'farokh'
];

// Helper: Pick N random unique elements from array
function pickRandomSeeds(count = 5) {
  const shuffled = [...ALL_CURATED_SEEDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}


// ─── App State ────────────────────────────────────────
let state = {
  scanning: false,
  portalOpen: false,
  // Auto-selected by default with 6 high-profile accounts (>5)
  targetHandles: ['VitalikButerin', 'balajis', 'sama', 'naval', 'levelsio', 'pmarca'],
  scannedTargets: [],
  results: [], // Curated list of up to 50 accounts
  allDiscoveredCount: 0,
  sortBy: 'score', // score | fb_ratio | followers
  filterType: 'all', // all | reciprocal | high_score
  targetUser: null,
  apiUsage: null,
  logs: []
};

// ─── Video Soundtrack Audio Engine (Compulsory, Seamless, Hidden) ──
class VideoSoundtrackEngine {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
  }

  init() {
    if (this.audio) return;
    this.audio = new Audio('/site-audio.mp3');
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0.5;

    this.play();
  }

  play() {
    if (!this.audio) this.init();
    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        this.isPlaying = true;
      }).catch(() => {
        this.isPlaying = false;
      });
    }
  }

  ensureRunning() {
    if (!this.audio) {
      this.init();
    } else if (this.audio.paused) {
      this.play();
    }
  }

  triggerScanPulse() {
    this.ensureRunning();
  }

  triggerNodeLock() {
    this.ensureRunning();
  }

  playShimmerChime() {
    this.ensureRunning();
  }
}

const ambientAudio = new VideoSoundtrackEngine();


// ─── Render Main Application ──────────────────────────
function render() {
  document.getElementById('app').innerHTML = `
    <!-- Background Video Layer -->
    <div class="video-bg-container">
      <video class="video-bg" autoplay loop muted playsinline poster="/bg-video.mp4">
        <source src="/bg-video.mp4" type="video/mp4" />
        <source src="https://2cleyyjiu4t0uoo0.public.blob.vercel-storage.com/47f22191-c7e4-4336-91cb-12441d4341da%20%281%29.mp4" type="video/mp4" />
      </video>
      <div class="video-bg-overlay"></div>
    </div>
    <div class="ambient-glow"></div>

    <div class="app-shell">
      <!-- Navigation Bar -->
      <nav class="nav">
        <a href="#" class="nav__brand">
          <div class="nav__logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 3a9 9 0 0 1 9 9"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="nav__brand-info">
            <span class="nav__brand-title">SORSA VOYAGER</span>
            <span class="nav__brand-badge">Multi-Target Radar</span>
          </div>
        </a>

        <ul class="nav__menu">
          <li class="nav__link-item nav__link-item--desktop"><a href="#" class="nav__link nav__link--active">Radar Console</a></li>
          <li class="nav__link-item nav__link-item--desktop"><a href="https://api.sorsa.io" target="_blank" rel="noopener" class="nav__link">API Docs</a></li>
          ${state.results.length > 0 ? `
            <li><button class="pill-btn is-active" id="btn-open-matrix">Matrix (${state.results.length})</button></li>
          ` : ''}
        </ul>
      </nav>

      <!-- Stage: Hero + Console -->
      <main class="stage">
        <!-- Editorial Headline -->
        <header class="hero-editorial">
          <div class="hero-editorial__tag">
            <span class="hero-editorial__tag-dot"></span>
            MULTI-TARGET RADAR · 50 ACCOUNT LEADERBOARD
          </div>
          <h1 class="hero-editorial__headline">
            UNCOVER
            <span>THE GRAPH</span>
          </h1>
          <p class="hero-editorial__copy">
            "Automatically discover high Sorsa Score accounts on X that reciprocate follows. Multi-target traversal across 5+ accounts delivers top 50 reciprocal candidates."
          </p>
        </header>

        <!-- Input Control Console -->
        <section class="console-card">
          <div class="console-grid">
            <!-- API Key Field -->
            <div class="field field--full">
              <label class="field__label" for="api-key-input">
                <span class="field__dot"></span>
                Sorsa API Key
              </label>
              <input type="password" class="field__input" id="api-key-input"
                placeholder="Enter your Sorsa API key (stored locally)"
                value="${getStoredApiKey()}"
                autocomplete="off" />
            </div>

            <!-- Multi-Handle Target Field -->
            <div class="field field--full">
              <div class="field__header-row">
                <label class="field__label">
                  <span class="field__dot field__dot--cyan"></span>
                  Target X Handles (${state.targetHandles.length} Selected)
                </label>
                <div class="field__actions">
                  <button type="button" class="btn-quick-action" id="btn-auto-pick" title="Automatically pick 5 random high-profile seeds">
                    🎲 Auto-Pick 5 Usernames
                  </button>
                  <button type="button" class="btn-quick-action btn-quick-action--clear" id="btn-clear-handles" title="Clear all handles">
                    Clear All
                  </button>
                </div>
              </div>

              <!-- Quick Presets -->
              <div class="presets-bar">
                <span class="presets-bar__label">Quick Presets (5+ Handles):</span>
                <button type="button" class="preset-chip" data-preset="web3">⚡ Web3 / Crypto (6)</button>
                <button type="button" class="preset-chip" data-preset="ai">🤖 AI & Tech (6)</button>
                <button type="button" class="preset-chip" data-preset="founders">🚀 Founders (6)</button>
                <button type="button" class="preset-chip" data-preset="vcs">💎 VCs & Angels (6)</button>
              </div>

              <!-- Handles Chips Box -->
              <div class="handles-container" id="handles-container">
                ${state.targetHandles.map((handle, idx) => `
                  <span class="handle-chip">
                    <span class="handle-chip__at">@</span>${escapeHtml(handle)}
                    <button type="button" class="handle-chip__remove" data-remove-index="${idx}" title="Remove handle">×</button>
                  </span>
                `).join('')}
                <input type="text" class="handles-inline-input" id="handle-inline-input"
                  placeholder="${state.targetHandles.length === 0 ? 'Type handle & press Enter, or paste list...' : '+ Add handle & press Enter...'}"
                  autocomplete="off" />
              </div>
              <p class="field__hint">Auto-picks 5+ usernames automatically. Type custom handle and press Enter or Comma. Paste comma-separated lists supported.</p>
            </div>
          </div>

          <div class="console-actions">
            <button class="btn-scan" id="btn-scan" ${state.scanning ? 'disabled' : ''}>
              ${state.scanning ? `
                <div class="budget-dot" style="width:12px;height:12px;background:#FFFFFF"></div>
                Traversing ${state.targetHandles.length} Graphs...
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                Scan Network Radar (${state.targetHandles.length} Handles)
              `}
            </button>

            <div class="budget-chip">
              <span class="budget-dot ${getBudgetClass()}"></span>
              <span id="budget-text">${getBudgetText()}</span>
            </div>
          </div>
        </section>
      </main>

      <!-- THE SIGNATURE LIQUID PORTAL (INVERTED OVERLAY) -->
      <div class="liquid-portal ${state.portalOpen ? 'is-active' : ''}" id="liquid-portal">
        <div class="portal-card">
          <div class="portal-card__mesh"></div>
          <div class="portal-body">
            <!-- Header -->
            <div class="portal-header">
              <div>
                <div class="portal-header__badge">Multi-Seed Network Intelligence</div>
                <h2 class="portal-header__title">
                  Top 50 Follow-Back <span>Accounts</span>
                </h2>
                <p class="portal-header__lead">
                  Discovered from ${state.scannedTargets.length || state.targetHandles.length} target seeds: 
                  <strong>${state.targetHandles.slice(0, 4).map(h => '@' + h).join(', ')}${state.targetHandles.length > 4 ? ` +${state.targetHandles.length - 4} more` : ''}</strong>. 
                  Ranked by Sorsa Score and reciprocity likelihood.
                </p>
              </div>

              <button class="btn-close-portal" id="btn-close-portal">
                ✕ Back to Radar
              </button>
            </div>

            <!-- Progress Bar -->
            <div class="portal-progress">
              <div class="portal-progress__fill" id="portal-progress-bar" style="width: ${getProgress()}%"></div>
            </div>

            <!-- Live Logs Terminal -->
            <div class="portal-terminal" id="portal-terminal">
              ${state.logs.length === 0 ? '<div class="portal-terminal__line">Initializing radar connection...</div>' : ''}
              ${state.logs.map(l => `<div class="portal-terminal__line">${escapeHtml(l)}</div>`).join('')}
            </div>

            <!-- 4-Up Stats -->
            <div class="portal-stats">
              <div class="stat-box">
                <div class="stat-box__label">Target Seeds</div>
                <div class="stat-box__value stat-box__value--user">${state.scannedTargets.length || state.targetHandles.length} Handles</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">Graph Candidates</div>
                <div class="stat-box__value stat-box__value--cyan">${state.allDiscoveredCount || state.results.length}</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">Top Reciprocal Leaderboard</div>
                <div class="stat-box__value stat-box__value--emerald">${state.results.length} Accounts</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">API Quota Spent</div>
                <div class="stat-box__value stat-box__value--amber">${state.apiUsage?.used || 0}</div>
              </div>
            </div>

            <!-- Table Actions & Filters -->
            <div class="portal-table-bar">
              <div>
                <h3 class="portal-table-title">Top 50 Follow-Back Leaderboard</h3>
                <span class="portal-table-subtitle">High-score accounts that reciprocate follows across scanned target networks</span>
              </div>
              
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                <div class="portal-pills">
                  <button class="pill-btn ${state.sortBy === 'score' ? 'is-active' : ''}" data-sort="score">Score ↓</button>
                  <button class="pill-btn ${state.sortBy === 'fb_ratio' ? 'is-active' : ''}" data-sort="fb_ratio">FB Ratio ↓</button>
                  <button class="pill-btn ${state.sortBy === 'followers' ? 'is-active' : ''}" data-sort="followers">Followers ↓</button>
                </div>

                <div class="portal-pills">
                  <button class="pill-btn ${state.filterType === 'all' ? 'is-active' : ''}" data-filter="all">All 50</button>
                  <button class="pill-btn ${state.filterType === 'reciprocal' ? 'is-active' : ''}" data-filter="reciprocal">Reciprocal ≥60%</button>
                  <button class="pill-btn ${state.filterType === 'high_score' ? 'is-active' : ''}" data-filter="high_score">Score ≥1.5</button>
                </div>

                <button class="btn-export-csv" id="btn-export-csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export CSV (50)
                </button>
              </div>
            </div>

            <!-- Results Table -->
            ${renderPortalTable()}
          </div>
        </div>
      </div>

      <!-- App Footer -->
      <footer class="app-footer">
        Powered by <a href="https://api.sorsa.io" target="_blank" rel="noopener">Sorsa API v3</a> · 
        Multi-Target Social Graph Discovery · Top 50 Radar
      </footer>
    </div>
  `;

  attachEventListeners();
}


function renderPortalTable() {
  if (state.results.length === 0) {
    return `
      <div style="text-align:center;padding:48px 20px;color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:10px;opacity:0.5">📡</div>
        <p>No candidate data available. Run a multi-target scan to populate the 50-account leaderboard.</p>
      </div>
    `;
  }

  let filtered = [...state.results];
  if (state.filterType === 'reciprocal') {
    filtered = filtered.filter(r => (r.fbRatio || 0) >= 0.6);
  } else if (state.filterType === 'high_score') {
    filtered = filtered.filter(r => (r.score || 0) >= 1.5);
  }

  const sorted = filtered.sort((a, b) => {
    if (state.sortBy === 'score') return (b.score || 0) - (a.score || 0);
    if (state.sortBy === 'fb_ratio') return (b.fbRatio || 0) - (a.fbRatio || 0);
    if (state.sortBy === 'followers') return (b.followers_count || 0) - (a.followers_count || 0);
    return 0;
  });

  const displayList = sorted.slice(0, 50);

  return `
    <div class="portal-table-wrap">
      <table class="portal-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Account</th>
            <th>Sorsa Score</th>
            <th>Followers</th>
            <th>Following</th>
            <th>FB Ratio</th>
            <th>Reciprocity</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${displayList.map((r, i) => {
            const rankClass = i === 0 ? 'rank-badge--gold' : i === 1 ? 'rank-badge--silver' : i === 2 ? 'rank-badge--bronze' : '';
            const seedsText = r.seedSources && r.seedSources.length > 0
              ? `via @${r.seedSources[0]}${r.seedSources.length > 1 ? ` +${r.seedSources.length - 1}` : ''}`
              : '';

            return `
              <tr>
                <td>
                  <span class="rank-badge ${rankClass}">#${i + 1}</span>
                </td>
                <td>
                  <div class="user-cell">
                    <img class="user-cell__avatar" 
                      src="${r.profile_image_url || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>'}" 
                      alt="${escapeHtml(r.display_name)}" 
                      loading="lazy" 
                      onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23102B59%22 width=%2240%22 height=%2240%22/><text fill=%22%2338BDF8%22 font-size=%2216%22 x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>?</text></svg>'" />
                    <div class="user-cell__meta">
                      <span class="user-cell__name">
                        ${escapeHtml(r.display_name || r.username)}
                        ${r.verified ? '<span class="user-cell__verified"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>' : ''}
                      </span>
                      <span class="user-cell__handle">
                        <a href="https://x.com/${r.username}" target="_blank" rel="noopener">@${r.username}</a>
                      </span>
                      ${seedsText ? `<span class="user-cell__seed-source">${escapeHtml(seedsText)}</span>` : ''}
                    </div>
                  </div>
                </td>
                <td>
                  <span class="score-chip ${getScoreClass(r.score)}">
                    ${r.score !== null && r.score !== undefined ? r.score.toFixed(2) : '—'}
                  </span>
                </td>
                <td class="mono-cell">${formatNumber(r.followers_count)}</td>
                <td class="mono-cell">${formatNumber(r.followings_count)}</td>
                <td>
                  <span class="reciprocity-chip ${getFbClass(r.fbRatio)}">
                    ${r.fbRatio !== null ? (r.fbRatio * 100).toFixed(0) + '%' : '—'}
                  </span>
                </td>
                <td>
                  <span class="reciprocity-chip ${getFbClass(r.fbRatio)}">
                    ${getFbLabel(r.fbRatio)}
                  </span>
                </td>
                <td>
                  <a href="https://x.com/${r.username}" target="_blank" rel="noopener" class="btn-row-action" title="Open profile on X">
                    Follow ↗
                  </a>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}


// ─── Event Listeners ──────────────────────────────────
function attachEventListeners() {
  const scanBtn = document.getElementById('btn-scan');
  if (scanBtn) scanBtn.addEventListener('click', startScan);

  const closePortalBtn = document.getElementById('btn-close-portal');
  if (closePortalBtn) {
    closePortalBtn.addEventListener('click', () => {
      state.portalOpen = false;
      render();
    });
  }

  const openMatrixBtn = document.getElementById('btn-open-matrix');
  if (openMatrixBtn) {
    openMatrixBtn.addEventListener('click', () => {
      state.portalOpen = true;
      render();
    });
  }

  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  // Auto-pick 5 random handles
  const autoPickBtn = document.getElementById('btn-auto-pick');
  if (autoPickBtn) {
    autoPickBtn.addEventListener('click', () => {
      state.targetHandles = pickRandomSeeds(5);
      render();
      ambientAudio.triggerNodeLock();
    });
  }

  // Clear all handles
  const clearBtn = document.getElementById('btn-clear-handles');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.targetHandles = [];
      render();
    });
  }

  // Preset chips
  document.querySelectorAll('.preset-chip[data-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const presetKey = chip.dataset.preset;
      if (SEED_PRESETS[presetKey]) {
        state.targetHandles = [...SEED_PRESETS[presetKey].handles];
        render();
        ambientAudio.triggerNodeLock();
      }
    });
  });

  // Remove individual handle chip
  document.querySelectorAll('.handle-chip__remove[data-remove-index]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeIndex, 10);
      if (!isNaN(idx) && idx >= 0 && idx < state.targetHandles.length) {
        state.targetHandles.splice(idx, 1);
        render();
      }
    });
  });

  // Inline handle input
  const inlineInput = document.getElementById('handle-inline-input');
  if (inlineInput) {
    inlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addHandleFromInput(inlineInput.value);
      } else if (e.key === 'Backspace' && inlineInput.value === '' && state.targetHandles.length > 0) {
        state.targetHandles.pop();
        render();
      }
    });

    inlineInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      if (pasted) {
        const parts = pasted.split(/[\s,;]+/).map(s => s.trim().replace(/^@/, '')).filter(Boolean);
        parts.forEach(p => {
          if (p && !state.targetHandles.map(h => h.toLowerCase()).includes(p.toLowerCase())) {
            state.targetHandles.push(p);
          }
        });
        render();
      }
    });
  }

  // Wake compulsory audio on input / interaction
  const consoleCard = document.querySelector('.console-card');
  if (consoleCard) {
    consoleCard.addEventListener('pointerdown', () => ambientAudio.ensureRunning(), { passive: true });
  }

  // Sort buttons
  document.querySelectorAll('.pill-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sortBy = btn.dataset.sort;
      render();
    });
  });

  // Filter buttons
  document.querySelectorAll('.pill-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filterType = btn.dataset.filter;
      render();
    });
  });

  const apiInput = document.getElementById('api-key-input');
  if (apiInput) {
    apiInput.addEventListener('change', () => {
      localStorage.setItem('sorsa_api_key', apiInput.value.trim());
    });
  }

  // Smooth Video Reveal
  const video = document.querySelector('.video-bg');
  if (video) {
    if (video.readyState >= 2) {
      video.classList.add('is-loaded');
    } else {
      video.addEventListener('loadeddata', () => video.classList.add('is-loaded'), { once: true });
      video.addEventListener('canplay', () => video.classList.add('is-loaded'), { once: true });
      setTimeout(() => video.classList.add('is-loaded'), 400);
    }
  }
}

function addHandleFromInput(raw) {
  const clean = raw.trim().replace(/^@/, '');
  if (clean && !state.targetHandles.map(h => h.toLowerCase()).includes(clean.toLowerCase())) {
    state.targetHandles.push(clean);
    render();
  }
}


// ─── Multi-Target Scanner Logic ───────────────────────
async function startScan() {
  const apiKey = document.getElementById('api-key-input')?.value.trim();
  const handles = state.targetHandles.map(h => h.trim().replace(/^@/, '')).filter(Boolean);

  if (!apiKey) return showError('Please enter your Sorsa API key');
  if (handles.length === 0) return showError('Please select or add at least one target handle');

  localStorage.setItem('sorsa_api_key', apiKey);

  const api = new SorsaAPI(apiKey);
  state.scanning = true;
  state.portalOpen = true;
  state.results = [];
  state.scannedTargets = [];
  state.logs = [];
  state.targetUser = null;
  state.allDiscoveredCount = 0;
  render();
  ambientAudio.triggerScanPulse();

  try {
    // 1. Balance verification
    addLog(`Connecting to Sorsa API v3 gateway for multi-target scan (${handles.length} seeds)...`);
    try {
      const usage = await api.getUsage();
      state.apiUsage = { 
        remaining: usage.remaining_requests, 
        total: usage.key_requests, 
        used: api.requestsUsed 
      };
      addLog(`Authenticated: ${usage.remaining_requests}/${usage.key_requests} requests quota remaining.`);

      const estimatedNeeded = handles.length * 2;
      if (usage.remaining_requests < estimatedNeeded) {
        addLog(`Notice: Remaining quota (${usage.remaining_requests}) is lower than suggested for ${handles.length} seeds (~${estimatedNeeded} calls). Traversing conservatively.`);
      }
    } catch (e) {
      addLog(`Quota notice: ${e.message}`);
      state.apiUsage = { remaining: '?', total: '?', used: api.requestsUsed };
    }

    // 2. Traversal across all target handles
    const accountMap = new Map();
    const totalHandles = handles.length;

    for (let i = 0; i < totalHandles; i++) {
      const handle = handles[i];
      const stepBase = (i / totalHandles) * 85;
      const stepSize = (1 / totalHandles) * 85;

      addLog(`──────────────────────────────────────────`);
      addLog(`[${i + 1}/${totalHandles}] Locking target radar on @${handle}...`);
      updateProgress(Math.round(stepBase + stepSize * 0.2));

      let profile = null;
      try {
        profile = await api.getUserProfile(handle);
        state.scannedTargets.push(profile);
        ambientAudio.triggerNodeLock();
        addLog(`Target node locked: ${profile.display_name || handle} (${formatNumber(profile.followers_count)} followers)`);
      } catch (e) {
        addLog(`Warning for @${handle}: ${e.message}. Continuing...`);
      }

      // Fetch top followers
      let topFollowers = [];
      try {
        updateProgress(Math.round(stepBase + stepSize * 0.5));
        const resp = await api.getTopFollowers(handle);
        topFollowers = resp?.users || [];
        addLog(`@${handle}: Discovered ${topFollowers.length} top-scoring followers.`);
      } catch (e) {
        addLog(`@${handle} followers: ${e.message}`);
      }

      // Fetch top following
      let topFollowing = [];
      try {
        updateProgress(Math.round(stepBase + stepSize * 0.8));
        const resp = await api.getTopFollowing(handle);
        topFollowing = resp?.users || [];
        addLog(`@${handle}: Discovered ${topFollowing.length} top-scoring following.`);
      } catch (e) {
        addLog(`@${handle} following: ${e.message}`);
      }

      // Fallback if both empty
      if (topFollowers.length === 0 && topFollowing.length === 0) {
        try {
          addLog(`@${handle}: Primary index empty, fetching follower sample...`);
          const resp = await api.getFollowers(handle);
          topFollowers = (resp?.users || []).slice(0, 25);
        } catch (e) {
          // ignore fallback error
        }
      }

      // Merge into accountMap
      const addList = (list, src) => {
        if (!Array.isArray(list)) return;
        list.forEach(entry => {
          if (!entry || !entry.username) return;
          const key = entry.username.toLowerCase();
          if (!accountMap.has(key)) {
            accountMap.set(key, { ...entry, _seedSources: [handle], _source: src });
          } else {
            const existing = accountMap.get(key);
            if (!existing._seedSources.includes(handle)) {
              existing._seedSources.push(handle);
            }
            if (!existing.score && entry.score) existing.score = entry.score;
            if (!existing.followers_count && entry.followers_count) existing.followers_count = entry.followers_count;
            if (!existing.followings_count && entry.followings_count) existing.followings_count = entry.followings_count;
          }
        });
      };

      addList(topFollowers, 'follower');
      addList(topFollowing, 'following');

      addLog(`Graph state: ${accountMap.size} unique candidate accounts discovered so far.`);
      updateProgress(Math.round(stepBase + stepSize));

      // Friendly API breather delay
      if (i < totalHandles - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    updateProgress(90);
    addLog(`Computing Follow-Back reciprocity ratios and ranking top 50 accounts...`);

    // Calculate reciprocity and scores
    const allResults = [];
    for (const [, acct] of accountMap) {
      const followers = acct.followers_count || 0;
      const following = acct.followings_count || 0;

      let fbRatio = null;
      if (followers > 0) {
        fbRatio = Math.min(following / followers, 2.0);
      } else if (following > 0) {
        fbRatio = 2.0;
      }

      allResults.push({
        username: acct.username,
        display_name: acct.display_name || acct.username,
        profile_image_url: acct.profile_image_url,
        verified: acct.verified,
        description: acct.description,
        followers_count: followers,
        followings_count: following,
        score: acct.score ?? null,
        fbRatio,
        seedSources: acct._seedSources || [],
        _source: acct._source
      });
    }

    state.allDiscoveredCount = allResults.length;

    // Filter valid accounts
    const valid = allResults.filter(r => r.followers_count > 0 || r.followings_count > 0);

    // Rank candidates:
    // Sort by Score descending, then FB ratio descending
    valid.sort((a, b) => {
      const scoreA = a.score !== null && a.score !== undefined ? a.score : -1;
      const scoreB = b.score !== null && b.score !== undefined ? b.score : -1;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const fbA = a.fbRatio || 0;
      const fbB = b.fbRatio || 0;
      return fbB - fbA;
    });

    // Exactly top 50 accounts
    state.results = valid.slice(0, 50);
    state.targetUser = state.scannedTargets[0] || { username: handles.join(', ') };
    state.apiUsage = { ...state.apiUsage, used: api.requestsUsed };

    addLog(`✓ Radar scan complete! Analyzed ${state.allDiscoveredCount} network nodes across ${handles.length} seeds.`);
    addLog(`✓ Discovered top 50 Follow-Back accounts ranked in Intelligence Matrix.`);
    updateProgress(100);
    ambientAudio.playShimmerChime();

  } catch (err) {
    addLog(`✗ Error: ${err.message}`);
    showError(err.message);
  }

  state.scanning = false;
  state.apiUsage = { ...state.apiUsage, used: api?.requestsUsed || 0 };
  render();
}


// ─── Helpers ──────────────────────────────────────────
function addLog(msg) {
  state.logs.push(msg);
  const terminal = document.getElementById('portal-terminal');
  if (terminal) {
    terminal.innerHTML += `<div class="portal-terminal__line">${escapeHtml(msg)}</div>`;
    terminal.scrollTop = terminal.scrollHeight;
  }
}

function updateProgress(pct) {
  const bar = document.getElementById('portal-progress-bar');
  if (bar) bar.style.width = `${pct}%`;
}

function getProgress() {
  if (!state.scanning && state.results.length > 0) return 100;
  return 0;
}

function getStoredApiKey() {
  return localStorage.getItem('sorsa_api_key') || '';
}

function getBudgetClass() {
  if (!state.apiUsage) return '';
  const remaining = state.apiUsage.remaining;
  if (remaining === '?') return '';
  if (remaining < 10) return 'budget-dot--danger';
  if (remaining < 30) return 'budget-dot--warn';
  return '';
}

function getBudgetText() {
  if (!state.apiUsage) return 'Key ready · Quota loaded on scan';
  const { remaining, total, used } = state.apiUsage;
  return `${used} used · ${remaining}/${total} remaining`;
}

function getScoreClass(score) {
  if (score === null || score === undefined) return 'score-chip--low';
  if (score >= 3) return 'score-chip--high';
  if (score >= 1) return 'score-chip--mid';
  return 'score-chip--low';
}

function getFbClass(ratio) {
  if (ratio === null) return 'reciprocity-chip--low';
  if (ratio >= 0.85) return 'reciprocity-chip--high';
  if (ratio >= 0.6) return 'reciprocity-chip--good';
  if (ratio >= 0.3) return 'reciprocity-chip--med';
  return 'reciprocity-chip--low';
}

function getFbLabel(ratio) {
  if (ratio === null) return '—';
  if (ratio >= 0.85) return 'High Reciprocity (≥85%)';
  if (ratio >= 0.6) return 'High Follow-Back (≥60%)';
  if (ratio >= 0.3) return 'Balanced (≥30%)';
  return 'Selective (<30%)';
}

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function showError(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `⚠ ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function exportCSV() {
  if (state.results.length === 0) return;

  const headers = ['Rank', 'Username', 'Display Name', 'Sorsa Score', 'Followers', 'Following', 'FB Ratio %', 'Reciprocity Likelihood', 'Discovered Via Seeds', 'Verified', 'Profile URL'];
  const rows = state.results.map((r, i) => [
    `#${i + 1}`,
    `@${r.username}`,
    `"${(r.display_name || '').replace(/"/g, '""')}"`,
    r.score !== null && r.score !== undefined ? r.score.toFixed(2) : '',
    r.followers_count,
    r.followings_count,
    r.fbRatio !== null ? (r.fbRatio * 100).toFixed(0) : '',
    getFbLabel(r.fbRatio),
    `"${(r.seedSources || []).join(', ')}"`,
    r.verified ? 'Yes' : 'No',
    `https://x.com/${r.username}`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sorsa-top-50-follow-back-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


// ─── Initialize ───────────────────────────────────────
render();

// Compulsory Celestial Ambient Sound auto-wake on any interaction
['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
  window.addEventListener(evt, () => {
    ambientAudio.ensureRunning();
  }, { passive: true });
});

// Auto-trigger immediately
ambientAudio.init();
