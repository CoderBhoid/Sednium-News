import type { UserSettings, BookmarkItem, Article } from '../types';

const SETTINGS_KEY = 'sednium_settings_v2';
const BOOKMARKS_KEY = 'sednium_bookmarks_v2';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  font: 'sans',
  warmth: 0,
  sort: 'latest',
  excludedSources: [],
  customFeeds: [],
};

export const StorageService = {
  getSettings(): UserSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      if (parsed.theme === 'oled') parsed.theme = 'dark';
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  },

  getBookmarks(): BookmarkItem[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (!raw) {
        // Migration from legacy bookmark format if present
        const legacy = localStorage.getItem('bookmarks');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          const migrated: BookmarkItem[] = parsed.map((item: any) => ({
            id: item.link || item.url,
            title: item.title,
            link: item.link || item.url,
            description: item.description || '',
            pubDate: item.pubDate || new Date().toISOString(),
            source_id: item.source_id || 'Saved Article',
            image_url: item.image_url || null,
            savedAt: Date.now(),
          }));
          this.saveBookmarks(migrated);
          return migrated;
        }
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveBookmarks(bookmarks: BookmarkItem[]): void {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed to persist bookmarks', e);
    }
  },

  clearAllBookmarks(): void {
    try {
      localStorage.removeItem(BOOKMARKS_KEY);
    } catch (e) {
      console.error('Failed to clear bookmarks', e);
    }
  },

  getLastReadArticle(): Article | null {
    try {
      const raw = localStorage.getItem('sednium_last_read');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLastReadArticle(article: Article): void {
    try {
      localStorage.setItem('sednium_last_read', JSON.stringify(article));
    } catch (e) {
      console.error('Failed to save last read article', e);
    }
  },

  toggleBookmark(article: Article): boolean {
    const list = this.getBookmarks();
    const index = list.findIndex(b => b.link === article.link);

    if (index >= 0) {
      list.splice(index, 1);
      this.saveBookmarks(list);
      return false; // removed
    } else {
      list.unshift({
        id: article.link,
        title: article.title,
        link: article.link,
        description: article.description,
        pubDate: article.pubDate,
        source_id: article.source_id,
        image_url: article.image_url,
        savedAt: Date.now(),
      });
      this.saveBookmarks(list);
      return true; // added
    }
  },

  isBookmarked(link: string): boolean {
    const list = this.getBookmarks();
    return list.some(b => b.link === link);
  }
};
