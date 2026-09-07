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


// ─── App State ────────────────────────────────────────
let state = {
  scanning: false,
  portalOpen: false,
  results: [],
  sortBy: 'score', // score | fb_ratio | followers
  targetUser: null,
  apiUsage: null,
  logs: []
};


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
            <span class="nav__brand-badge">Network Intelligence</span>
          </div>
        </a>

        <ul class="nav__menu">
          <li><a href="#" class="nav__link nav__link--active">Radar Console</a></li>
          <li><a href="https://api.sorsa.io" target="_blank" rel="noopener" class="nav__link">API Docs</a></li>
          ${state.results.length > 0 ? `
            <li><button class="pill-btn is-active" id="btn-open-matrix">Open Matrix (${state.results.length})</button></li>
          ` : ''}
        </ul>
      </nav>

      <!-- Stage: Hero + Console -->
      <main class="stage">
        <!-- Editorial Headline -->
        <header class="hero-editorial">
          <div class="hero-editorial__tag">
            <span class="hero-editorial__tag-dot"></span>
            RADAR ONLINE · SORSA V3 API
          </div>
          <h1 class="hero-editorial__headline">
            UNCOVER
            <span>THE GRAPH</span>
          </h1>
          <p class="hero-editorial__copy">
            "Detect high Sorsa Score accounts on X that reciprocate follows. Deep network traversal executed with conservative API quota footprint."
          </p>
        </header>

        <!-- Input Control Console -->
        <section class="console-card">
          <div class="console-grid">
            <div class="field">
              <label class="field__label" for="api-key-input">
                <span class="field__dot"></span>
                Sorsa API Key
              </label>
              <input type="password" class="field__input" id="api-key-input"
                placeholder="Enter Sorsa API key"
                value="${getStoredApiKey()}"
                autocomplete="off" />
            </div>

            <div class="field">
              <label class="field__label" for="username-input">
                <span class="field__dot field__dot--cyan"></span>
                Target X Handle
              </label>
              <input type="text" class="field__input" id="username-input"
                placeholder="e.g. VitalikButerin"
                autocomplete="off" />
            </div>
          </div>

          <div class="console-actions">
            <button class="btn-scan" id="btn-scan" ${state.scanning ? 'disabled' : ''}>
              ${state.scanning ? `
                <div class="budget-dot" style="width:12px;height:12px;background:#FFFFFF"></div>
                Traversing Graph...
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                Scan Network Radar
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
                <div class="portal-header__badge">Network Intelligence Matrix</div>
                <h2 class="portal-header__title">
                  Follow-Back <span>Reciprocity</span>
                </h2>
                <p class="portal-header__lead">
                  Target: @${state.targetUser?.username || '—'} · High-score accounts identified with favorable follow-to-follower ratios.
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
                <div class="stat-box__label">Target Profile</div>
                <div class="stat-box__value stat-box__value--user">@${state.targetUser?.username || '—'}</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">Nodes Analyzed</div>
                <div class="stat-box__value stat-box__value--cyan">${state.results.length}</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">Reciprocal Accounts</div>
                <div class="stat-box__value stat-box__value--emerald">${state.results.filter(r => (r.fbRatio || 0) >= 0.7).length}</div>
              </div>
              <div class="stat-box">
                <div class="stat-box__label">API Quota Spent</div>
                <div class="stat-box__value stat-box__value--amber">${state.apiUsage?.used || 0}</div>
              </div>
            </div>

            <!-- Table Actions & Filters -->
            <div class="portal-table-bar">
              <h3 class="portal-table-title">Discovered Follow-Back Candidates</h3>
              
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                <div class="portal-pills">
                  <button class="pill-btn ${state.sortBy === 'score' ? 'is-active' : ''}" data-sort="score">Score ↓</button>
                  <button class="pill-btn ${state.sortBy === 'fb_ratio' ? 'is-active' : ''}" data-sort="fb_ratio">FB Ratio ↓</button>
                  <button class="pill-btn ${state.sortBy === 'followers' ? 'is-active' : ''}" data-sort="followers">Followers ↓</button>
                </div>

                <button class="btn-export-csv" id="btn-export-csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export CSV
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
        Precision Social Graph Discovery · Oceanic Edition
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
        <p>No candidate data available. Run a scan to discover accounts.</p>
      </div>
    `;
  }

  const sorted = [...state.results].sort((a, b) => {
    if (state.sortBy === 'score') return (b.score || 0) - (a.score || 0);
    if (state.sortBy === 'fb_ratio') return (b.fbRatio || 0) - (a.fbRatio || 0);
    if (state.sortBy === 'followers') return (b.followers_count || 0) - (a.followers_count || 0);
    return 0;
  });

  return `
    <div class="portal-table-wrap">
      <table class="portal-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Account</th>
            <th>Sorsa Score</th>
            <th>Followers</th>
            <th>Following</th>
            <th>FB Ratio</th>
            <th>Reciprocity</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((r, i) => `
            <tr>
              <td class="mono-cell" style="opacity:0.6">${i + 1}</td>
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
            </tr>
          `).join('')}
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

  document.querySelectorAll('.pill-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sortBy = btn.dataset.sort;
      render();
    });
  });

  const apiInput = document.getElementById('api-key-input');
  if (apiInput) {
    apiInput.addEventListener('change', () => {
      localStorage.setItem('sorsa_api_key', apiInput.value.trim());
    });
  }
}


// ─── Scanner Logic ────────────────────────────────────
async function startScan() {
  const apiKey = document.getElementById('api-key-input')?.value.trim();
  const username = document.getElementById('username-input')?.value.trim().replace('@', '');

  if (!apiKey) return showError('Please enter your Sorsa API key');
  if (!username) return showError('Please enter a target X handle');

  localStorage.setItem('sorsa_api_key', apiKey);

  const api = new SorsaAPI(apiKey);
  state.scanning = true;
  state.portalOpen = true;
  state.results = [];
  state.logs = [];
  state.targetUser = null;
  render();

  try {
    // 1. Balance verification
    addLog('Connecting to Sorsa API v3 gateway...');
    try {
      const usage = await api.getUsage();
      state.apiUsage = { 
        remaining: usage.remaining_requests, 
        total: usage.key_requests, 
        used: api.requestsUsed 
      };
      addLog(`Authenticated: ${usage.remaining_requests}/${usage.key_requests} requests quota remaining.`);

      if (usage.remaining_requests < 5) {
        throw new Error(`Only ${usage.remaining_requests} requests remaining — need at least 5 to scan.`);
      }
    } catch (e) {
      addLog(`Quota notice: ${e.message}`);
      state.apiUsage = { remaining: '?', total: '?', used: api.requestsUsed };
    }

    // 2. Fetch target profile
    addLog(`Acquiring target node @${username}...`);
    updateProgress(15);
    const targetProfile = await api.getUserProfile(username);
    state.targetUser = targetProfile;
    addLog(`Node locked: ${targetProfile.display_name} (${formatNumber(targetProfile.followers_count)} followers, ${formatNumber(targetProfile.followings_count)} following)`);

    // 3. Top followers by Sorsa score
    addLog('Scanning top followers by Sorsa Score...');
    updateProgress(35);
    let topFollowers = [];
    try {
      const topFollowersResp = await api.getTopFollowers(username);
      topFollowers = topFollowersResp?.users || [];
      addLog(`Identified ${topFollowers.length} top scoring followers.`);
    } catch (e) {
      addLog(`Top followers scan: ${e.message}`);
    }

    // 4. Top following by Sorsa score
    addLog('Scanning top following by Sorsa Score...');
    updateProgress(55);
    let topFollowing = [];
    try {
      const topFollowingResp = await api.getTopFollowing(username);
      topFollowing = topFollowingResp?.users || [];
      addLog(`Identified ${topFollowing.length} top scoring following accounts.`);
    } catch (e) {
      addLog(`Top following scan: ${e.message}`);
    }

    // 5. Fallback if empty
    if (topFollowers.length === 0 && topFollowing.length === 0) {
      addLog('Account not indexed in primary index. Engaging fallback follower lookup...');
      updateProgress(65);

      try {
        const followersResp = await api.getFollowers(username);
        const followersList = followersResp?.users || [];
        addLog(`Discovered ${followersList.length} candidate followers.`);

        const candidates = followersList
          .filter(u => {
            if (!u.followers_count || !u.followings_count) return true;
            return u.followings_count / u.followers_count >= 0.3;
          })
          .slice(0, 25);

        addLog(`Querying individual Sorsa scores for ${candidates.length} high-ratio candidates...`);
        updateProgress(75);

        let scoreFetched = 0;
        const maxScoreFetches = Math.min(candidates.length, 15);
        for (let i = 0; i < maxScoreFetches; i++) {
          const c = candidates[i];
          try {
            const scoreResp = await api.getScore(c.username);
            c.score = scoreResp?.score ?? null;
            scoreFetched++;
            updateProgress(75 + (scoreFetched / maxScoreFetches) * 20);
          } catch (e) {
            c.score = null;
          }
        }
        addLog(`Processed ${scoreFetched} score lookups.`);
        topFollowers = candidates;
      } catch (e) {
        addLog(`Fallback traversal: ${e.message}`);
      }
    }

    updateProgress(90);

    // 6. Merge & compute Follow-Back reciprocity
    const accountMap = new Map();
    const addAccounts = (list, source) => {
      if (!Array.isArray(list)) return;
      list.forEach(entry => {
        if (!entry || !entry.username) return;
        const key = entry.username.toLowerCase();
        if (!accountMap.has(key)) {
          accountMap.set(key, { ...entry, _source: source });
        } else {
          const existing = accountMap.get(key);
          if (!existing.score && entry.score) existing.score = entry.score;
          if (!existing.followers_count && entry.followers_count) existing.followers_count = entry.followers_count;
          if (!existing.followings_count && entry.followings_count) existing.followings_count = entry.followings_count;
        }
      });
    };

    addAccounts(topFollowers, 'follower');
    addAccounts(topFollowing, 'following');

    const results = [];
    for (const [, acct] of accountMap) {
      const followers = acct.followers_count || 0;
      const following = acct.followings_count || 0;

      let fbRatio = null;
      if (followers > 0) {
        fbRatio = Math.min(following / followers, 2.0);
      } else if (following > 0) {
        fbRatio = 2.0;
      }

      results.push({
        username: acct.username,
        display_name: acct.display_name,
        profile_image_url: acct.profile_image_url,
        verified: acct.verified,
        description: acct.description,
        followers_count: followers,
        followings_count: following,
        score: acct.score ?? null,
        fbRatio,
        _source: acct._source
      });
    }

    state.results = results.filter(r => r.followers_count > 0 || r.followings_count > 0);
    state.apiUsage = { ...state.apiUsage, used: api.requestsUsed };
    addLog(`✓ Scan complete! ${state.results.length} accounts analyzed using ${api.requestsUsed} API calls.`);
    updateProgress(100);

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

  const headers = ['Username', 'Display Name', 'Sorsa Score', 'Followers', 'Following', 'FB Ratio %', 'Reciprocity Likelihood', 'Verified'];
  const rows = state.results
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(r => [
      `@${r.username}`,
      `"${(r.display_name || '').replace(/"/g, '""')}"`,
      r.score !== null && r.score !== undefined ? r.score.toFixed(2) : '',
      r.followers_count,
      r.followings_count,
      r.fbRatio !== null ? (r.fbRatio * 100).toFixed(0) : '',
      getFbLabel(r.fbRatio),
      r.verified ? 'Yes' : 'No'
    ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sorsa-reciprocity-${state.targetUser?.username || 'radar'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


// ─── Initialize ───────────────────────────────────────
render();
