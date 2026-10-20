# 🎵 AyushMuzic Web

<div align="center">
  <img src="website/assets/logo.png" width="120" height="120" alt="AyushMuzic Logo" />
  <h3>Experience Music Without Limits.</h3>
  <p>Next-Gen Ad-Free Web Music Streaming Player with Apple Music liquid-glass aesthetics, synchronized lyrics, and YouTube Music Song Radio.</p>
</div>

---

## ✨ Features

- 🎧 **Full YouTube Music Catalog**: Stream trending music, search millions of tracks, artists, and albums.
- 📻 **Endless Song Radio Queue**: Dynamic recommendation engine powered by native YouTube Music `getUpNext`.
- 📝 **Synchronized Lyrics**: Word-by-word synced lyrics and plain lyrics powered by LRCLIB.
- 🎨 **AMOLED Dark Aesthetic**: Custom-crafted dark UI (`#0a0a0f`) with Electric Violet & Sunset Pink glassmorphism.
- 🧾 **Listening Receipts & Analytics**: Track top artists, songs, and generate shareable listening receipts.
- 📱 **Pure Progressive Web App (PWA)**: Installable on iOS Safari, Android Chrome, and Desktop with offline caching.
- 🔒 **Zero Login Required**: 100% private. Liked songs, custom playlists, and history are stored locally.

---

## 🚀 Architecture

- **`/` (Root)**: Official AyushMuzic Landing & Showcase Website (features, interactive player demo, listening receipt preview, and download hub).
- **`/play`**: The full-featured AyushMuzic Web Player SPA.
- **`/api/*`**: Real-time backend API proxying YouTube Music data and audio streams.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/jaatayushh/ayushmuzicweb.git
cd ayushmuzicweb

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit:
- **Landing Website**: `http://localhost:3000`
- **Music Player**: `http://localhost:3000/play`

---

## 📦 Production Build

```bash
npm run build
npm start
```

---

## 🌐 Deploying to GitHub Pages

This repository includes an automated GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
3. Push to `main` branch to trigger automated deployment!

---

## 📄 License

GPL-3.0 License. Free & Open Source.
