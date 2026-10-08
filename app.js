// Streamer Search — No API keys required
// YouTube via public Invidious instances
// Twitch via public GraphQL endpoint
// Watch opens full-page player in a new tab on this site

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
let activeInvidious = INVIDIOUS_INSTANCES[0];

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

/** Open the site's full-page player in a new browser tab */
function openPlayer(item) {
  const params = new URLSearchParams();

  if (item.platform === 'youtube' && item.videoId) {
    params.set('type', 'yt');
    params.set('id', item.videoId);
    params.set('inv', activeInvidious);
  } else if (item.platform === 'twitch' && item.login) {
    params.set('type', 'twitch');
    params.set('id', item.login);
  } else {
    window.open(item.url, '_blank');
    return;
  }

  params.set('title', item.title || 'Watching');
  params.set('url', item.url || '');

  const watchUrl = 'watch.html?' + params.toString();
  window.open(watchUrl, '_blank');
}

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

// ---- YouTube via Invidious (videos + channels) ----
async function searchYouTube(query) {
  let lastError = null;

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const [videosRes, channelsRes] = await Promise.all([
        fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=channel`, { signal: AbortSignal.timeout(8000) })
      ]);

      if (!videosRes.ok && !channelsRes.ok) throw new Error(`HTTP ${videosRes.status}`);

      const videos = videosRes.ok ? await videosRes.json() : [];
      const channels = channelsRes.ok ? await channelsRes.json() : [];

      activeInvidious = base;

      const videoItems = (videos || [])
        .filter(item => item.type === 'video')
        .slice(0, 10)
        .map(item => ({
          platform: 'youtube',
          type: 'video',
          id: item.videoId,
          videoId: item.videoId,
          title: item.title,
          description: item.description || item.author || '',
          thumbnail: fixThumb(item.videoThumbnails),
          url: `https://www.youtube.com/watch?v=${item.videoId}`,
          meta: [
            item.author,
            item.viewCount ? `${formatCount(item.viewCount)} views` : null,
            item.lengthSeconds ? formatDuration(item.lengthSeconds) : null
          ].filter(Boolean).join(' · '),
          live: !!item.liveNow,
          canWatch: true
        }));

      const channelItems = (channels || [])
        .filter(item => item.type === 'channel')
        .slice(0, 6)
        .map(item => ({
          platform: 'youtube',
          type: 'channel',
          id: item.authorId,
          title: item.author,
          description: item.description || '',
          thumbnail: fixThumb(item.authorThumbnails),
          url: `https://www.youtube.com/channel/${item.authorId}`,
          meta: item.subCount ? `${formatCount(item.subCount)} subscribers` : '',
          live: false,
          canWatch: false
        }));

      return [...videoItems, ...channelItems];
    } catch (err) {
      lastError = err;
      console.warn(`Invidious ${base} failed:`, err.message);
    }
  }

  throw new Error(lastError?.message || 'All YouTube proxies failed. Try again later.');
}

function fixThumb(thumbs) {
  if (!thumbs || !thumbs.length) return '';
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

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
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
    const login = item.login;

    return {
      platform: 'twitch',
      type: 'channel',
      id: item.id,
      login: login,
      title: item.displayName || login,
      description: item.description || item.broadcastSettings?.title || '',
      thumbnail: item.profileImageURL || '',
      url: `https://www.twitch.tv/${login}`,
      meta: item.followers?.totalCount
        ? `${formatCount(item.followers.totalCount)} followers`
        : (item.broadcastSettings?.title || ''),
      live: false,
      game: '',
      canWatch: false
    };
  });

  items = await enrichTwitchLive(items);

  if (liveOnly.checked) {
    items = items.filter(c => c.live);
  }

  return items.slice(0, 12);
}

async function enrichTwitchLive(items) {
  const top = items.slice(0, 10);
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
          variables: { login: item.login }
        })
      });
      const data = await res.json();
      const stream = data?.data?.user?.stream;
      if (stream) {
        item.live = true;
        item.canWatch = true;
        item.game = stream.game?.name || '';
        item.description = stream.title || item.description;
        item.meta = stream.viewersCount
          ? `${formatCount(stream.viewersCount)} viewers · ${item.game || ''}`.trim()
          : item.meta;
        item.thumbnail = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${item.login}-640x360.jpg`;
      } else {
        item.live = false;
        item.canWatch = false;
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

  const canWatch = item.canWatch || (item.platform === 'youtube' && item.videoId);

  const thumbHtml = item.thumbnail
    ? `<img class="card-thumb" src="${item.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="card-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);height:100%">No image</div>`;

  const playOverlay = canWatch
    ? `<div class="card-play-overlay"><button class="card-play-btn" aria-label="Watch">▶</button></div>`
    : '';

  const platformLabel = item.platform === 'youtube'
    ? `<span class="card-platform youtube">▶ YouTube ${item.type === 'video' ? 'Video' : 'Channel'}</span>`
    : `<span class="card-platform twitch">📺 Twitch</span>`;

  const liveBadge = item.live ? `<span class="live-badge">LIVE</span>` : '';

  const watchBtn = canWatch
    ? `<button class="btn watch watch-btn">Watch</button>`
    : '';

  card.innerHTML = `
    <div class="card-thumb-wrap ${canWatch ? 'has-play' : ''}">
      ${thumbHtml}
      ${playOverlay}
    </div>
    <div class="card-body">
      ${platformLabel}
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-meta">${escapeHtml(item.meta || item.game || '')}</p>
      <p class="card-desc">${escapeHtml(item.description || '')}</p>
      <div class="card-footer">
        <div style="display:flex;align-items:center;gap:8px">
          ${liveBadge}
          ${watchBtn}
        </div>
        <a class="card-link" href="${item.url}" target="_blank" rel="noopener">Open →</a>
      </div>
    </div>
  `;

  if (canWatch) {
    const open = () => openPlayer(item);
    card.querySelector('.card-play-overlay')?.addEventListener('click', open);
    card.querySelector('.watch-btn')?.addEventListener('click', open);
  }

  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
