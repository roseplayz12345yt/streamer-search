# Streamer Search

A modern, **key-free** website to **search and watch** YouTube videos & Twitch live streams.

![License](https://img.shields.io/badge/license-MIT-blue)
![No API Keys](https://img.shields.io/badge/API%20keys-not%20required-success)
![Watch in new tab](https://img.shields.io/badge/watch-new%20tab%20player-purple)

## Features

- Search **YouTube videos + channels** (via public Invidious instances)
- Search **Twitch streamers** (via Twitch public GraphQL)
- **Watch opens a full-page player in a new tab** on this site
- Filter Twitch results to **Live only**
- Combined search (Both platforms)
- Beautiful dark UI with play overlays
- **No API keys required**
- Fully static — works with GitHub Pages

## Live Demo

Enable GitHub Pages on this repo, then visit:

**https://roseplayz12345yt.github.io/streamer-search/**

## How watching works

Click **Watch** (or the play button) on any video / live stream card.

A **new browser tab** opens on this site (`watch.html`) with a full-page player:

| Content | Player |
|---------|--------|
| YouTube videos | Invidious embed |
| Twitch live streams | Official Twitch player |

You can also use **Open original** to go to YouTube/Twitch, or **Close tab** when done.

## How search works

| Platform | Source |
|----------|--------|
| YouTube  | Public [Invidious](https://invidious.io) instances |
| Twitch   | Official public GraphQL (`gql.twitch.tv`) |

Everything runs in the browser. No backend, no keys, no signup.

## Project structure

```
streamer-search/
├── index.html      # Search page
├── watch.html      # Full-page player (opens in new tab)
├── styles.css      # Dark modern UI
├── app.js          # Search + open player in new tab
└── README.md
```

## Enabling GitHub Pages

1. Go to the repository **Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Select branch `main` and folder `/ (root)`
4. Save — the site will be live in about a minute

**Note for Twitch embeds:** Twitch requires the correct `parent` domain. On GitHub Pages this is set automatically.

## Notes

- Invidious instances can go down; the app automatically tries several.
- Twitch GQL is undocumented and may change.
- This is a demo / educational project. Respect YouTube & Twitch terms of service.

## License

MIT — feel free to fork, modify, and use.

---

Made for the open-source community 💜
