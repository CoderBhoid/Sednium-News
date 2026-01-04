# Sednium News 💎

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![Status](https://img.shields.io/badge/status-stable-success.svg)

> A modern, premium news aggregation app crafted for speed, readability, and elegance.
> Powered by **Sednium**.

---

## ✨ Features

### 📖 Unified Reading Experience
-   **No more redirects**: We scrape essential content and present it in a clean, unified "Reader View".
-   **Smart Proxy**: Powered by a custom **Vercel Serverless Function** to reliable fetch content.
-   **Multi-layer Fallback**: Tries Own Proxy → AllOrigins → CorsProxy to guarantee content load.

### 🎨 Premium Design
-   **Glassmorphism Branding**: Beautiful UI with vibrant gradients and blur effects.
-   **Dark Mode**: Optimized deep-dark theme for OLED screens.
-   **Smooth Animations**: Staggered entry animations, swipe gestures, and micro-interactions.

### ⚡ Power User Tools
-   **Bookmarks**: Save articles locally to read later (persists via LocalStorage).
-   **Share**: Native share sheet integration.
-   **Gestures**: Swipe left/right to navigate articles seamlessly.
-   **RSS Feed**: Dynamic RSS generation for launcher integration (e.g., Smart Launcher 6).

---

## 🛠️ Tech Stack

-   **Frontend**: Vanilla JS, HTML5, CSS3 (No heavy frameworks!)
-   **Mobile**: Ionic Capacitor (Native Android Wrapper)
-   **Backend**: Vercel Serverless Functions (Node.js)
-   **API**: NewsData.io

---

## 🌐 Deployment (Web)

This project is optimized for **Vercel**.

1.  **Fork/Push** this repo to GitHub.
2.  **Import** project to Vercel.
3.  **Done!** Vercel auto-configures:
    -   Frontend: `https://sednium-news.vercel.app`
    -   API: `https://sednium-news.vercel.app/api/proxy`
    -   RSS Feed: `https://sednium-news.vercel.app/rss` (Top News)

### 📡 Specific Feed Links
Copy these exact links into Smart Launcher:

| Category | URL |
| :--- | :--- |
| **Technology** | `https://sednium-news.vercel.app/rss/technology` |
| **Sports** | `https://sednium-news.vercel.app/rss/sports` |
| **Business** | `https://sednium-news.vercel.app/rss/business` |
| **Entertainment** | `https://sednium-news.vercel.app/rss/entertainment` |
| **Science** | `https://sednium-news.vercel.app/rss/science` |
| **Health** | `https://sednium-news.vercel.app/rss/health` |

---

## 📱 Download Android App

🚀 **Get the App!**
You can download the latest signed **APK** directly from our [Releases Page](https://github.com/CoderBhoid/Sednium-News/releases).

1.  Go to **Releases**.
2.  Download `app-release.apk`.
3.  Install! (You may need to "Allow from Unknown Sources").

---

## © License
Copyright 2025 **Sednium**.
Proudly Open Source.

Made with ❤️ by **Bhoid**.
