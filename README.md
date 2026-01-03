# Sednium News

A modern, polished news aggregation app featuring a unified read view, bookmarking, and native mobile support.

## 🚀 Features

-   **Unified Read View**: Scrapes full article content using a custom reliable proxy.
-   **Smart Fallbacks**: Multiple proxy layers (Own Proxy -> AllOrigins -> CorsProxy).
-   **Bookmarks**: Save articles locally for later reading.
-   **Native Mobile Experience**: Pull-to-refresh, swipe navigation, and smooth animations.
-   **Premium UI**: Dark mode, glassmorphism design, and custom typography.
-   **RSS Feed**: Dynamic RSS generation for launchers (e.g., Smart Launcher 6).

## 📂 Project Structure

-   `N-News/`: Main web application (HTML/CSS/JS) and assets.
-   `api/`: Vercel Serverless Functions.
    -   `proxy.js`: Custom article scraper/proxy.
    -   `rss.js`: RSS feed generator.
-   `android/`: Native Android project (Capacitor).

## 🌐 Deployment (Web)

This project is configured for **Vercel**.

1.  Push this repository to GitHub.
2.  Import the project into Vercel.
3.  Vercel will automatically detect `vercel.json` and deploy:
    -   Frontend at `https://your-app.vercel.app/`
    -   RSS Feed at `https://your-app.vercel.app/rss`
    -   Proxy API at `https://your-app.vercel.app/api/proxy`

## 📱 Build for Mobile (Android)

1.  **Sync Web Assets**:
    ```bash
    npx cap sync
    ```
2.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```
3.  **Build**:
    -   Go to **Build > Generate Signed Bundle / APK**.
    -   Follow the [Mobile Release Guide](mobile_release_guide.md) for signing details.

## 🛠️ Local Development

To run the web app locally:
1.  Open `N-News/index.html` in your browser.
    *   *Note: Article scraping (proxy) requires the Vercel backend and won't work fully in a local file setup.*

To run the full stack locally, use `vercel dev` if installed.
