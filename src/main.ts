import './styles/index.css';

import {
  createIcons,
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Share2,
  Volume2,
  Square,
  Play,
  Pause,
  Moon,
  Sun,
  CircleDot,
  X,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Trash2,
  Rss,
  Radio,
  Palette,
  User,
  Globe,
  GitBranch,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Newspaper,
  BookOpen,
  Clock,
  Shuffle,
  Copy,
  ShieldCheck,
  MessageSquare
} from 'lucide';

import { store } from './state/store';
import { ApiService } from './services/api';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { ReaderView } from './components/ReaderView';
import { SettingsDrawer } from './components/SettingsDrawer';
import { BottomNav } from './components/BottomNav';
import { PrivacyModal } from './components/PrivacyModal';
import type { CategoryKey } from './types';

// Expose createIcons globally so components can invoke it after rendering DOM
const iconsMap = {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Share2,
  Volume2,
  Square,
  Play,
  Pause,
  Moon,
  Sun,
  CircleDot,
  X,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Trash2,
  Rss,
  Radio,
  Palette,
  User,
  Globe,
  GitBranch,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Newspaper,
  BookOpen,
  Clock,
  Shuffle,
  Copy,
  ShieldCheck,
  MessageSquare
};

export function renderLucideIcons(): void {
  createIcons({ icons: iconsMap });
}

(window as any).lucide = {
  createIcons: renderLucideIcons
};

// Main application orchestrator
class App {
  private appRoot: HTMLElement;
  private settingsDrawer: SettingsDrawer;
  private privacyModal: PrivacyModal;

  constructor() {
    this.appRoot = document.getElementById('app') || document.body;
    this.settingsDrawer = new SettingsDrawer();
    this.privacyModal = new PrivacyModal();
    this.init();
  }

  private async init(): Promise<void> {
    // 1. Apply user preferences to DOM immediately
    store.applySettingsToDOM();

    // 2. Mount components
    const header = new Header();
    const newsFeed = new NewsFeed();
    const readerView = new ReaderView();
    const bottomNav = new BottomNav();

    this.appRoot.appendChild(header.getElement());
    this.appRoot.appendChild(newsFeed.getElement());
    this.appRoot.appendChild(readerView.getElement());
    this.appRoot.appendChild(this.settingsDrawer.getElement());
    this.appRoot.appendChild(this.privacyModal.getElement());
    this.appRoot.appendChild(bottomNav.getElement());

    // 3. Register listeners
    this.setupGlobalListeners();
    this.setupRouteHandling();

    // 4. Initial news loading based on URL or defaults
    await this.handleInitialRoute();

    // 5. Initial Lucide icon generation
    renderLucideIcons();

    // 6. Service Worker registration
    this.registerServiceWorker();
  }

  private setupGlobalListeners(): void {
    // Native Android haptic feedback on interactive taps
    document.addEventListener('click', (e) => {
      const interactiveEl = (e.target as HTMLElement)?.closest('button, .category-pill, .card-interactive, .btn-interactive, .icon-action-btn, a[href]');
      if (interactiveEl && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // ignore
        }
      }
    }, { passive: true });

    // Listen for custom reload-feed events
    document.addEventListener('reload-feed', () => {
      if (store.getState().searchQuery) {
        this.performSearch(store.getState().searchQuery);
      } else {
        this.loadCategoryNews(store.getState().activeCategory);
      }
    });

    // Listen for live news search events
    document.addEventListener('search-news', async (e: any) => {
      const query = e.detail?.query;
      if (!query) return;
      store.setView('feed');
      store.setActiveArticle(null);
      this.updateUrl({ query });
      await this.performSearch(query);
    });

    // Listen for clear search events
    document.addEventListener('clear-search', async () => {
      store.setSearchQuery('');
      this.updateUrl({ query: '' });
      await this.loadCategoryNews(store.getState().activeCategory);
    });

    // Keyboard shortcut: Escape closes settings or modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('close-settings'));
        this.privacyModal.close();
      }
    });

    // When category or view changes in store, sync document title for SEO, fetch news, and update URL
    let lastCategory = store.getState().activeCategory;
    store.subscribe((state) => {
      // Sync document title for On-Page SEO
      if (state.view === 'saved') {
        document.title = 'Saved Articles — Sednium News';
      } else if (state.view === 'feed') {
        if (state.searchQuery) {
          document.title = `"${state.searchQuery}" Search Results — Sednium News`;
        } else {
          const cat = state.activeCategory || 'top';
          const catName = cat === 'top' ? 'Headlines' : cat.charAt(0).toUpperCase() + cat.slice(1);
          document.title = `${catName} — Sednium News`;
        }
      }

      if (state.activeCategory !== lastCategory && state.view === 'feed' && !state.searchQuery) {
        lastCategory = state.activeCategory;
        this.updateUrl({ category: state.activeCategory, query: '' });
        this.loadCategoryNews(state.activeCategory);
      }
    });
  }

  private setupRouteHandling(): void {
    window.addEventListener('popstate', () => {
      const params = new URLSearchParams(window.location.search);
      const readUrl = params.get('read');
      const cat = (params.get('category') || 'top') as CategoryKey;
      const queryParam = params.get('q');

      if (readUrl) {
        store.setActiveArticle({
          title: 'Direct Article',
          link: readUrl,
          description: '',
          pubDate: new Date().toISOString(),
          source_id: 'External Story'
        });
      } else if (queryParam) {
        store.setActiveArticle(null);
        store.setSearchQuery(queryParam);
        store.setView('feed');
        this.performSearch(queryParam);
      } else {
        store.setActiveArticle(null);
        store.setSearchQuery('');
        store.setCategory(cat);
        store.setView('feed');
      }
    });
  }

  private async handleInitialRoute(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const readUrl = params.get('read');
    const categoryParam = params.get('category') as CategoryKey;
    const queryParam = params.get('q');

    if (categoryParam) {
      store.setCategory(categoryParam);
    }

    if (readUrl) {
      // Direct reader link requested
      store.setActiveArticle({
        title: 'Loading Story...',
        link: readUrl,
        description: '',
        pubDate: new Date().toISOString(),
        source_id: 'Direct Story'
      });
    } else if (queryParam) {
      store.setSearchQuery(queryParam);
      await this.performSearch(queryParam);
    } else {
      await this.loadCategoryNews(store.getState().activeCategory);
    }
  }

  private async loadCategoryNews(category: CategoryKey | 'custom'): Promise<void> {
    store.setLoading(true);
    try {
      const articles = await ApiService.getNews(category);
      store.setArticles(articles, false);
    } catch (err: any) {
      store.setError(err.message || 'Unable to load news stories');
    } finally {
      store.setLoading(false);
      renderLucideIcons();
    }
  }

  private async performSearch(query: string): Promise<void> {
    store.setLoading(true);
    try {
      const currentCat = store.getState().activeCategory;
      const articles = await ApiService.getNews(currentCat, query);
      store.setArticles(articles, true);
    } catch (err: any) {
      store.setError(err.message || 'Unable to search news stories');
    } finally {
      store.setLoading(false);
      renderLucideIcons();
    }
  }

  private updateUrl(params: { category?: string; read?: string; query?: string }): void {
    const currentUrl = new URL(window.location.href);
    if (params.category) {
      currentUrl.searchParams.set('category', params.category);
      currentUrl.searchParams.delete('read');
    }
    if (params.read) {
      currentUrl.searchParams.set('read', params.read);
    }
    if (params.query !== undefined) {
      if (params.query) {
        currentUrl.searchParams.set('q', params.query);
      } else {
        currentUrl.searchParams.delete('q');
      }
    }
    window.history.pushState({}, '', currentUrl.toString());
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
          .catch(err => console.warn('[PWA] ServiceWorker registration skipped:', err.message));
      });
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
