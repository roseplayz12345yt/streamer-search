# Streamer Search

A modern, **key-free** website to **search and watch** YouTube videos & Twitch live streams.

![License](https://img.shields.io/badge/license-MIT-blue)
![No API Keys](https://img.shields.io/badge/API%20keys-not%20required-success)
![Watch in-site](https://img.shields.io/badge/watch-in--site%20player-purple)

## Features

- Search **YouTube videos + channels** (via public Invidious instances)
- Search **Twitch streamers** (via Twitch public GraphQL)
- **Watch videos and live streams directly on the site** (embedded player)
- Filter Twitch results to **Live only**
- Combined search (Both platforms)
- Beautiful dark UI with play overlays
- **No API keys required**
- Fully static — works with GitHub Pages

## Live Demo

Enable GitHub Pages on this repo, then visit:

**https://roseplayz12345yt.github.io/streamer-search/**

## How watching works

| Content | How it plays |
|---------|--------------|
| YouTube videos | Embedded via Invidious (privacy-friendly) or YouTube |
| Twitch live streams | Official Twitch player embed (`player.twitch.tv`) |

Click **Watch** or the play button on any video/live card to open the in-site player.

## How search works

| Platform | Source |
|----------|--------|
| YouTube  | Public [Invidious](https://invidious.io) instances |
| Twitch   | Official public GraphQL (`gql.twitch.tv`) |

Everything runs in the browser. No backend, no keys, no signup.

## Project structure

```
streamer-search/
├── index.html      # Main page + player modal
├── styles.css      # Dark modern UI + player
├── app.js          # Search + embed logic
└── README.md
```

## Enabling GitHub Pages

1. Go to the repository **Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Select branch `main` and folder `/ (root)`
4. Save — the site will be live in about a minute

**Note for Twitch embeds:** Twitch requires the correct `parent` domain. On GitHub Pages this is automatically set to `roseplayz12345yt.github.io`.

## Notes

- Invidious instances can go down; the app automatically tries several.
- Twitch GQL is undocumented and may change.
- This is a demo / educational project. Respect YouTube & Twitch terms of service.

## License

MIT — feel free to fork, modify, and use.

---

Made for the open-source community 💜
