import type { Article, BookmarkItem, CategoryKey, UserSettings, ViewMode } from '../types';
import { StorageService } from '../services/storage';

export interface AppState {
  articles: Article[];
  filteredArticles: Article[];
  activeCategory: CategoryKey | 'custom';
  searchQuery: string;
  isSearchResultFeed: boolean;
  view: ViewMode;
  activeArticle: Article | null;
  lastReadArticle: Article | null;
  bookmarks: BookmarkItem[];
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  detectedSources: string[];
}

type StateListener = (state: AppState) => void;

class Store {
  private state: AppState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    const settings = StorageService.getSettings();
    const bookmarks = StorageService.getBookmarks();
    const lastReadArticle = StorageService.getLastReadArticle();

    this.state = {
      articles: [],
      filteredArticles: [],
      activeCategory: 'top',
      searchQuery: '',
      isSearchResultFeed: false,
      view: 'feed',
      activeArticle: null,
      lastReadArticle,
      bookmarks,
      settings,
      isLoading: false,
      error: null,
      detectedSources: [],
    };
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.computeFilteredArticles();
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private computeFilteredArticles(): void {
    let list = [...this.state.articles];

    // Filter by excluded sources
    if (this.state.settings.excludedSources.length > 0) {
      const excluded = new Set(this.state.settings.excludedSources);
      list = list.filter(a => !excluded.has(a.source_id));
    }

    // Only apply local query filtering if NOT already a server-side search feed
    if (this.state.searchQuery.trim() && !this.state.isSearchResultFeed) {
      const q = this.state.searchQuery.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);
      // Support numeral equivalence e.g. 1 <=> i <=> one
      const termSynonyms = terms.map(term => {
        if (term === '1') return ['1', 'i', 'one', 'first'];
        if (term === '2') return ['2', 'ii', 'two', 'second'];
        if (term === '3') return ['3', 'iii', 'three', 'third'];
        return [term];
      });

      list = list.filter(a => {
        const text = `${a.title} ${a.description} ${a.source_id}`.toLowerCase();
        return termSynonyms.every(syns => syns.some(s => text.includes(s)));
      });
    }

    // Apply sort preference
    if (this.state.settings.sort === 'latest') {
      list.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    }

    this.state.filteredArticles = list;
  }

  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  setArticles(articles: Article[], isSearchResult: boolean = false): void {
    this.state.articles = articles;
    this.state.isSearchResultFeed = isSearchResult;
    this.state.error = null;

    // Extract unique sources
    const sources = Array.from(new Set(articles.map(a => a.source_id).filter(Boolean))).sort();
    this.state.detectedSources = sources;

    this.notify();
  }

  setCategory(cat: CategoryKey | 'custom'): void {
    this.state.activeCategory = cat;
    this.state.searchQuery = '';
    this.state.isSearchResultFeed = false;
    this.state.view = 'feed';
    this.notify();
  }

  setSearchQuery(q: string): void {
    this.state.searchQuery = q;
    if (!q.trim()) {
      this.state.isSearchResultFeed = false;
    }
    this.notify();
  }

  setView(view: ViewMode): void {
    this.state.view = view;
    this.notify();
  }

  setActiveArticle(article: Article | null): void {
    this.state.activeArticle = article;
    if (article) {
      this.state.lastReadArticle = article;
      StorageService.saveLastReadArticle(article);
      this.state.view = 'reader';
    }
    this.notify();
  }

  toggleBookmark(article: Article): boolean {
    const isNowSaved = StorageService.toggleBookmark(article);
    this.state.bookmarks = StorageService.getBookmarks();
    this.notify();
    return isNowSaved;
  }

  updateSettings(partial: Partial<UserSettings>): void {
    this.state.settings = { ...this.state.settings, ...partial };
    StorageService.saveSettings(this.state.settings);
    this.applySettingsToDOM();
    this.notify();
  }

  addCustomFeed(url: string): boolean {
    if (!url || !url.startsWith('http')) return false;
    const current = this.state.settings.customFeeds;
    if (current.includes(url)) return false;

    this.updateSettings({
      customFeeds: [...current, url]
    });
    return true;
  }

  removeCustomFeed(url: string): void {
    const updated = this.state.settings.customFeeds.filter(f => f !== url);
    this.updateSettings({ customFeeds: updated });
  }

  toggleSourceExclusion(source: string): void {
    const current = new Set(this.state.settings.excludedSources);
    if (current.has(source)) {
      current.delete(source);
    } else {
      current.add(source);
    }
    this.updateSettings({ excludedSources: Array.from(current) });
  }

  applySettingsToDOM(): void {
    const { theme, font, warmth } = this.state.settings;
    const docEl = document.documentElement;

    // Theme class: light or pure OLED dark
    docEl.classList.remove('light', 'dark', 'oled');
    if (theme === 'light') {
      docEl.classList.add('light');
    } else {
      docEl.classList.add('dark');
    }

    // Dynamic theme logo and favicon switcher requested by user
    const logoSrc = theme === 'light' ? '/assets/logolight.png' : '/assets/logo.png';
    document.querySelectorAll<HTMLImageElement>('#brand-home img, #reader-brand-home img, #reader-logo-img').forEach(img => {
      img.src = logoSrc;
    });
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = logoSrc;
    }

    // Font class
    docEl.classList.remove('font-ndot', 'font-sans', 'font-serif');
    docEl.classList.add(`font-${font}`);

    // Warmth overlay adjustment
    let warmthEl = document.getElementById('warmth-overlay');
    if (!warmthEl) {
      warmthEl = document.createElement('div');
      warmthEl.id = 'warmth-overlay';
      warmthEl.className = 'pointer-events-none fixed inset-0 z-50 transition-opacity duration-300';
      document.body.appendChild(warmthEl);
    }

    if (warmth === 0) {
      warmthEl.style.backgroundColor = 'transparent';
    } else if (warmth > 0) {
      // Warm amber
      const alpha = (warmth / 100) * 0.35;
      warmthEl.style.backgroundColor = `rgba(255, 140, 0, ${alpha})`;
    } else {
      // Cool blue
      const alpha = (Math.abs(warmth) / 100) * 0.25;
      warmthEl.style.backgroundColor = `rgba(0, 100, 255, ${alpha})`;
    }
  }
}

export const store = new Store();
