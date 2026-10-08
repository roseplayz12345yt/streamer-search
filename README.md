# Streamer Search

A modern, client-side website to search for **YouTube channels** and **Twitch streamers**.

![License](https://img.shields.io/badge/license-MIT-blue)
![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-success)

## Features

- Search YouTube channels by keyword
- Search Twitch streamers / channels
- Filter Twitch results to **live only**
- Combined search (Both platforms)
- Beautiful dark UI
- API keys stored only in your browser (localStorage)
- Fully static — works with GitHub Pages

## Live Demo

Once you enable GitHub Pages on this repo, the site will be available at:

**https://roseplayz12345yt.github.io/streamer-search/**

## Setup (for developers / self-hosting)

1. **Clone the repo**
   ```bash
   git clone https://github.com/roseplayz12345yt/streamer-search.git
   cd streamer-search
   ```

2. **Get API keys**

   ### YouTube Data API v3
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a project → Enable **YouTube Data API v3**
   - Create an API key

   ### Twitch
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Register an application
   - Copy the **Client ID** and generate a **Client Secret**

3. **Open the site**
   - Open `index.html` in a browser, **or**
   - Serve with any static server (`npx serve`, VS Code Live Server, etc.)

4. Paste your keys in the **API Keys Setup** section and click **Save Keys**.

## How it works

- All requests are made **from the browser** using the official APIs.
- Twitch uses the Client Credentials flow to obtain an app access token (cached in localStorage).
- No backend or server is required.

## Project structure

```
streamer-search/
├── index.html      # Main page
├── styles.css      # Dark modern UI
├── app.js          # Search logic + API calls
└── README.md
```

## Enabling GitHub Pages

1. Go to the repository **Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Select branch `main` and folder `/ (root)`
4. Save — the site will be live in ~1 minute

## License

MIT — feel free to fork, modify, and use.

---

Made for the open-source community 💜
