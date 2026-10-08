# Streamer Search

A modern, **key-free** website to search for **YouTube channels** and **Twitch streamers**.

![License](https://img.shields.io/badge/license-MIT-blue)
![No API Keys](https://img.shields.io/badge/API%20keys-not%20required-success)

## Features

- Search YouTube channels (via public Invidious instances)
- Search Twitch streamers (via Twitch public GraphQL)
- Filter Twitch results to **Live only**
- Combined search (Both platforms)
- Beautiful dark UI
- **No API keys required**
- Fully static — works with GitHub Pages

## Live Demo

Enable GitHub Pages on this repo, then visit:

**https://roseplayz12345yt.github.io/streamer-search/**

## How it works

| Platform | Source |
|----------|--------|
| YouTube  | Public [Invidious](https://invidious.io) instances (`/api/v1/search`) |
| Twitch   | Official public GraphQL endpoint (`gql.twitch.tv`) with the web Client-ID |

Everything runs in the browser. No backend, no keys, no signup.

## Project structure

```
streamer-search/
├── index.html      # Main page
├── styles.css      # Dark modern UI
├── app.js          # Search logic (Invidious + Twitch GQL)
└── README.md
```

## Enabling GitHub Pages

1. Go to the repository **Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Select branch `main` and folder `/ (root)`
4. Save — the site will be live in about a minute

## Notes

- Invidious instances can go down or rate-limit; the app automatically tries several.
- Twitch GQL is undocumented and may change; the hash used is the current public one.
- This is a demo / educational project. Respect YouTube & Twitch terms of service.

## License

MIT — feel free to fork, modify, and use.

---

Made for the open-source community 💜
