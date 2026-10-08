// Streamer Search — No API keys required
// YouTube via public Invidious instances
// Twitch via public GraphQL endpoint

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://yewtu.be',
  'https://inv.tux.pizza',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space'
];

const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
const TWITCH_SEARCH_HASH = 'c2df3c3038e88bde5af3da9c0bdd215ee83ab9a5850c7e57afdbc223ea74e102';

let currentPlatform = 'youtube';

// DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const liveOnly = document.getElementById('live-only');
const resultsGrid = document.getElementById('results-grid');
const emptyState = document.getElementById('empty-state');
const loading = document.getElementById('loading');
const tabs = document.querySelectorAll('.tab');

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
    resultsGrid.innerHTML = `<p style="grid-column:1/-1;padding:20px;color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
  }

  loading.hidden = true;

  if (results.length === 0) {
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = 'No results found. Try a different query.';
    return;
  }

  results.forEach(r => resultsGrid.appendChild(createCard(r)));
}

// ---- YouTube via Invidious ----
async function searchYouTube(query) {
  let lastError = null;

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=channel`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      return (data || [])
        .filter(item => item.type === 'channel')
        .slice(0, 12)
        .map(item => ({
          platform: 'youtube',
          id: item.authorId,
          title: item.author,
          description: item.description || '',
          thumbnail: fixThumb(item.authorThumbnails),
          url: `https://www.youtube.com/channel/${item.authorId}`,
          meta: item.subCount ? `${formatCount(item.subCount)} subscribers` : '',
          live: false
        }));
    } catch (err) {
      lastError = err;
      console.warn(`Invidious ${base} failed:`, err.message);
    }
  }

  throw new Error(lastError?.message || 'All YouTube proxies failed. Try again later.');
}

function fixThumb(thumbs) {
  if (!thumbs || !thumbs.length) return '';
  // Prefer larger size
  const sorted = [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0));
  let url = sorted[0].url || '';
  if (url.startsWith('//')) url = 'https:' + url;
  return url;
}

function formatCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// ---- Twitch via public GQL ----
async function searchTwitch(query) {
  const body = [{
    operationName: 'SearchResultsPage_SearchResults',
    variables: {
      platform: 'web',
      query: query,
      options: { targets: null, shouldSkipDiscoveryControl: false },
      requestID: crypto.randomUUID()
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: TWITCH_SEARCH_HASH
      }
    }
  }];

  const res = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Twitch GQL error ${res.status}`);
  const data = await res.json();

  const edges = data?.[0]?.data?.searchFor?.channels?.edges || [];

  let items = edges.map(edge => {
    const item = edge.item || edge.node || {};
    const isLive = !!(item.stream || (item.lastBroadcast && item.latestVideo?.edges?.[0]?.node?.status === 'RECORDING'));
    // Better live detection: check if stream object exists in some responses
    const live = !!item.stream || (item.broadcastSettings && item.lastBroadcast);

    return {
      platform: 'twitch',
      id: item.id,
      title: item.displayName || item.login,
      description: item.description || item.broadcastSettings?.title || '',
      thumbnail: item.profileImageURL || '',
      url: `https://www.twitch.tv/${item.login}`,
      meta: item.followers?.totalCount
        ? `${formatCount(item.followers.totalCount)} followers`
        : (item.broadcastSettings?.title || ''),
      live: !!item.stream, // stream presence is the cleanest live signal
      game: item.stream?.game?.name || ''
    };
  });

  // Re-fetch live status more accurately for top results if needed
  // For simplicity we use what GQL returns; improve live detection:
  items = await enrichTwitchLive(items);

  if (liveOnly.checked) {
    items = items.filter(c => c.live);
  }

  return items.slice(0, 12);
}

async function enrichTwitchLive(items) {
  // Batch simple user lookups for live status (max 5 to stay light)
  const top = items.slice(0, 8);
  const lookups = top.map(async (item) => {
    try {
      const res = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `query($login: String!) { user(login: $login) { stream { id title game { name } viewersCount } } }`,
          variables: { login: item.url.split('/').pop() }
        })
      });
      const data = await res.json();
      const stream = data?.data?.user?.stream;
      if (stream) {
        item.live = true;
        item.game = stream.game?.name || item.game;
        item.description = stream.title || item.description;
        item.meta = stream.viewersCount
          ? `${formatCount(stream.viewersCount)} viewers`
          : item.meta;
      } else {
        item.live = false;
      }
    } catch (_) { /* ignore */ }
    return item;
  });

  await Promise.all(lookups);
  return items;
}

// ---- Card renderer ----
function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  const thumb = item.thumbnail
    ? `<img class="card-thumb" src="${item.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">`
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
      <p class="card-meta">${escapeHtml(item.meta || item.game || '')}</p>
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
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
