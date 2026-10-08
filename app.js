// Streamer Search - Client-side YouTube & Twitch search

const STORAGE_KEYS = {
  yt: 'ss_yt_key',
  twitchId: 'ss_twitch_id',
  twitchSecret: 'ss_twitch_secret',
  twitchToken: 'ss_twitch_token',
  twitchTokenExp: 'ss_twitch_token_exp'
};

let currentPlatform = 'youtube';

// DOM
const ytKeyInput = document.getElementById('yt-key');
const twitchIdInput = document.getElementById('twitch-id');
const twitchSecretInput = document.getElementById('twitch-secret');
const saveKeysBtn = document.getElementById('save-keys');
const keysStatus = document.getElementById('keys-status');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const liveOnly = document.getElementById('live-only');
const resultsGrid = document.getElementById('results-grid');
const emptyState = document.getElementById('empty-state');
const loading = document.getElementById('loading');
const tabs = document.querySelectorAll('.tab');

// Load saved keys
function loadKeys() {
  ytKeyInput.value = localStorage.getItem(STORAGE_KEYS.yt) || '';
  twitchIdInput.value = localStorage.getItem(STORAGE_KEYS.twitchId) || '';
  twitchSecretInput.value = localStorage.getItem(STORAGE_KEYS.twitchSecret) || '';
}

saveKeysBtn.addEventListener('click', () => {
  localStorage.setItem(STORAGE_KEYS.yt, ytKeyInput.value.trim());
  localStorage.setItem(STORAGE_KEYS.twitchId, twitchIdInput.value.trim());
  localStorage.setItem(STORAGE_KEYS.twitchSecret, twitchSecretInput.value.trim());
  // Clear old token so it refreshes
  localStorage.removeItem(STORAGE_KEYS.twitchToken);
  localStorage.removeItem(STORAGE_KEYS.twitchTokenExp);
  keysStatus.textContent = 'Keys saved successfully!';
  keysStatus.className = 'status ok';
  setTimeout(() => { keysStatus.textContent = ''; }, 3000);
});

// Tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPlatform = tab.dataset.platform;
  });
});

// Search on Enter
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});
searchBtn.addEventListener('click', doSearch);

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  emptyState.hidden = true;
  resultsGrid.innerHTML = '';
  loading.hidden = false;

  const results = [];

  try {
    if (currentPlatform === 'youtube' || currentPlatform === 'both') {
      const yt = await searchYouTube(q);
      results.push(...yt);
    }
    if (currentPlatform === 'twitch' || currentPlatform === 'both') {
      const tw = await searchTwitch(q);
      results.push(...tw);
    }
  } catch (err) {
    console.error(err);
    resultsGrid.innerHTML = `<p class="status err" style="grid-column:1/-1;padding:20px">Error: ${err.message}</p>`;
  }

  loading.hidden = true;

  if (results.length === 0) {
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = 'No results found. Try a different query or check your API keys.';
    return;
  }

  results.forEach(r => resultsGrid.appendChild(createCard(r)));
}

// ---- YouTube ----
async function searchYouTube(query) {
  const key = localStorage.getItem(STORAGE_KEYS.yt);
  if (!key) throw new Error('YouTube API key is missing. Add it in the settings above.');

  // Search channels first
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=12&key=${key}`;
  const res = await fetch(searchUrl);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube API error ${res.status}`);
  }
  const data = await res.json();

  return (data.items || []).map(item => ({
    platform: 'youtube',
    id: item.id.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    url: `https://www.youtube.com/channel/${item.id.channelId}`,
    publishedAt: item.snippet.publishedAt,
    live: false
  }));
}

// ---- Twitch ----
async function getTwitchToken() {
  const clientId = localStorage.getItem(STORAGE_KEYS.twitchId);
  const clientSecret = localStorage.getItem(STORAGE_KEYS.twitchSecret);
  if (!clientId || !clientSecret) throw new Error('Twitch Client ID and Secret are required.');

  const cached = localStorage.getItem(STORAGE_KEYS.twitchToken);
  const exp = parseInt(localStorage.getItem(STORAGE_KEYS.twitchTokenExp) || '0', 10);
  if (cached && Date.now() < exp - 60000) return cached;

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`
  });
  if (!res.ok) throw new Error('Failed to get Twitch token. Check Client ID & Secret.');
  const data = await res.json();
  localStorage.setItem(STORAGE_KEYS.twitchToken, data.access_token);
  localStorage.setItem(STORAGE_KEYS.twitchTokenExp, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

async function searchTwitch(query) {
  const clientId = localStorage.getItem(STORAGE_KEYS.twitchId);
  const token = await getTwitchToken();

  // Search channels
  const searchUrl = `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=12`;
  const res = await fetch(searchUrl, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Twitch API error ${res.status}`);
  }
  const data = await res.json();

  let items = data.data || [];

  if (liveOnly.checked) {
    items = items.filter(c => c.is_live);
  }

  return items.map(c => ({
    platform: 'twitch',
    id: c.id,
    title: c.display_name,
    description: c.title || c.game_name || '',
    thumbnail: c.thumbnail_url?.replace('{width}', '320').replace('{height}', '180') || '',
    url: `https://www.twitch.tv/${c.broadcaster_login}`,
    live: c.is_live,
    game: c.game_name
  }));
}

// ---- Card renderer ----
function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  const thumb = item.thumbnail
    ? `<img class="card-thumb" src="${item.thumbnail}" alt="" loading="lazy">`
    : `<div class="card-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">No image</div>`;

  const platformLabel = item.platform === 'youtube'
    ? `<span class="card-platform youtube">▶ YouTube</span>`
    : `<span class="card-platform twitch">📺 Twitch</span>`;

  const liveBadge = item.live ? `<span class="live-badge">LIVE</span>` : '';

  card.innerHTML = `
    ${thumb}
    <div class="card-body">
      ${platformLabel}
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-meta">${item.game ? escapeHtml(item.game) : ''}</p>
      <p class="card-desc">${escapeHtml(item.description || '')}</p>
      <div class="card-footer">
        ${liveBadge}
        <a class="card-link" href="${item.url}" target="_blank" rel="noopener">View →</a>
      </div>
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
loadKeys();
