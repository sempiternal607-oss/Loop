# Loop - Modern Web Music Streaming Player

**Loop** is a modern, lightweight, and responsive music streaming web application built with Next.js 16, Tailwind CSS v4, and YouTube Music API integration.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

---

## ✨ Features

- 🎵 **Music Streaming & Discovery**: Seamless playback powered by YouTube IFrame API and YouTube Music charts/recommendations.
- 🎤 **Real-time Synchronized Lyrics**: Karaoke-style synced lyrics powered by LRCLIB with auto-scroll and jump-to-time capabilities.
- 🎨 **Adaptive Light & Dark Themes**:
  - **Dark Mode**: Deep obsidian and emerald neon accents with glowing glassmorphism surfaces.
  - **Light Mode**: Radiant, minimalist white design with subtle azure blue touches and high contrast typography.
- 📱 **Progressive Web App (PWA)**: Installable on mobile and desktop devices with responsive touch-optimized layout.
- 📑 **Custom Playlists**: Create, manage, and shuffle customized playlists with persistent local storage.
- 🧑‍🎤 **Artist Discography**: Explore artist profiles, top tracks, and release albums directly within modal view.
- ⏩ **SponsorBlock Integration**: Automatically skips non-music sponsor segments, intros, and outros.
- 🎚️ **Precision Audio Controls**: Scrubbing seek bar, volume control, repeat, and smart shuffle.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/sempiternal607-oss/Loop.git

# Navigate to project directory
cd Loop

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Engine**: YouTube IFrame API & YouTube Music (ytmusicapi)
- **Lyrics Provider**: [LRCLIB](https://lrclib.net/)
