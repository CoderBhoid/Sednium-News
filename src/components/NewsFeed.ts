import { store } from '../state/store';
import type { Article, BookmarkItem } from '../types';
import { Toast } from './Toast';
import { getCategoryFallbackImage } from '../utils/fallbackImages';
import { ApiService } from '../services/api';

export class NewsFeed {
  private el: HTMLElement;

  constructor() {
    this.el = document.createElement('main');
    this.el.id = 'feed-container';
    this.el.className = 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 transition-opacity duration-200';
    this.setupSubscription();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private setupSubscription(): void {
    store.subscribe((state) => {
      // If reader view is active, hide feed container
      if (state.view === 'reader') {
        this.el.classList.add('hidden');
        return;
      }
      this.el.classList.remove('hidden');

      if (state.isLoading) {
        this.renderLoading();
      } else if (state.error) {
        this.renderError(state.error);
      } else if (state.view === 'saved') {
        this.renderSaved(state.bookmarks);
      } else {
        this.renderArticles(state.filteredArticles, state.activeCategory, state.searchQuery);
      }

      // Re-trigger Lucide icons render
      if (typeof (window as any).lucide !== 'undefined') {
        (window as any).lucide.createIcons();
      }
    });
  }

  private renderLoading(): void {
    const state = store.getState();
    const catLabel = (state.activeCategory || 'top').toUpperCase();
    const isSearch = Boolean(state.searchQuery);

    this.el.innerHTML = `
      <div class="w-full mb-6 flex items-center justify-between border-b border-subtle pb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full bg-[#D71921] animate-pulse"></span>
          <h1 class="font-brand text-xl font-bold tracking-wide text-primary">
            ${isSearch ? 'SEARCH' : catLabel}
          </h1>
          ${isSearch ? `<span class="text-xs font-mono text-[#D71921] bg-[#D71921]/10 px-2.5 py-0.5 rounded-full border border-[#D71921]/30 font-medium">"${state.searchQuery}"</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs text-muted tracking-wider uppercase animate-pulse">Loading stories...</span>
        </div>
      </div>
      <div class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${Array.from({ length: 6 }).map(() => `
          <div class="w-full flex flex-col justify-between rounded-xl border border-subtle bg-card overflow-hidden">
            <!-- Image placeholder (Strict 16:9 widescreen ratio) -->
            <div class="relative w-full aspect-[16/9] skeleton-shimmer border-b border-subtle flex items-center justify-center">
              <i data-lucide="newspaper" class="w-8 h-8 text-zinc-700/30"></i>
              <!-- Publisher badge placeholder in top left -->
              <div class="absolute top-3 left-3 w-20 h-5 rounded-full bg-black/20 dark:bg-black/60 border border-black/10 dark:border-white/10 flex items-center justify-center">
                <div class="w-12 h-2 rounded-full skeleton-shimmer"></div>
              </div>
            </div>

            <!-- Body placeholder -->
            <div class="p-5 flex-1 flex flex-col justify-between">
              <div class="space-y-2 mb-4">
                <div class="h-5 w-11/12 rounded-sm skeleton-shimmer mb-2"></div>
                <div class="h-5 w-3/4 rounded-sm skeleton-shimmer mb-3.5"></div>
                <div class="h-3.5 w-full rounded-sm skeleton-shimmer mb-1.5 opacity-60"></div>
                <div class="h-3.5 w-4/5 rounded-sm skeleton-shimmer mb-4 opacity-60"></div>
              </div>

              <!-- Footer placeholder -->
              <div class="pt-4 border-t border-subtle flex items-center justify-between">
                <div class="h-3.5 w-24 rounded-sm skeleton-shimmer opacity-70"></div>
                <div class="flex items-center gap-1.5">
                  <div class="w-6 h-6 rounded-md skeleton-shimmer opacity-60"></div>
                  <div class="w-6 h-6 rounded-md skeleton-shimmer opacity-60"></div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderError(error: string): void {
    this.el.innerHTML = `
      <div class="py-16 text-center max-w-md mx-auto">
        <div class="inline-flex p-4 rounded-full border border-[#D71921]/30 bg-[#D71921]/10 text-[#D71921] mb-4">
          <i data-lucide="alert-triangle" class="w-8 h-8"></i>
        </div>
        <h2 class="font-brand text-xl font-bold mb-2">SIGNAL INTERRUPTED</h2>
        <p class="text-secondary text-sm mb-6">${error}</p>
        <button
          id="retry-feed-btn"
          class="btn-interactive cursor-pointer px-5 py-2.5 bg-card hover:bg-card-hover border border-strong rounded-full text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-2"
        >
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          Retry Extraction
        </button>
      </div>
    `;

    this.el.querySelector('#retry-feed-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('reload-feed'));
    });
  }

  private renderSaved(bookmarks: BookmarkItem[]): void {
    if (bookmarks.length === 0) {
      this.el.innerHTML = `
        <div class="py-20 text-center max-w-sm mx-auto">
          <div class="inline-flex p-4 rounded-full border border-subtle bg-card text-muted mb-4">
            <i data-lucide="bookmark" class="w-8 h-8"></i>
          </div>
          <h2 class="font-brand text-xl font-bold mb-2">NO SAVED ARTICLES</h2>
          <p class="text-secondary text-sm mb-6">Bookmark interesting stories while reading to store them locally for offline access.</p>
          <button
            id="back-to-feed-btn"
            class="btn-interactive cursor-pointer px-5 py-2.5 bg-[#D71921] hover:bg-[#b5141b] text-white rounded-full text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            Explore Headlines &rarr;
          </button>
        </div>
      `;

      this.el.querySelector('#back-to-feed-btn')?.addEventListener('click', () => {
        store.setView('feed');
      });
      return;
    }

    const articles: Article[] = bookmarks.map(b => ({
      title: b.title,
      link: b.link,
      description: b.description,
      pubDate: b.pubDate,
      source_id: b.source_id,
      image_url: b.image_url,
    }));

    this.el.innerHTML = `
      <div class="mb-6 flex items-center justify-between border-b border-subtle pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 bg-[#D71921] rounded-full"></span>
          <h1 class="font-brand text-xl font-bold tracking-wide">SAVED ARTICLES</h1>
        </div>
        <span class="font-mono text-xs text-muted">${bookmarks.length} ARCHIVED</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="articles-grid"></div>
    `;

    this.renderCardList(articles);
  }

  private renderArticles(articles: Article[], category: string, searchQuery: string): void {
    if (articles.length === 0) {
      this.el.innerHTML = `
        <div class="py-20 text-center max-w-md mx-auto">
          <div class="inline-flex p-4 rounded-full border border-subtle bg-card text-muted mb-4">
            <i data-lucide="inbox" class="w-8 h-8"></i>
          </div>
          <h2 class="font-brand text-xl font-bold mb-2">NO ARTICLES FOUND</h2>
          <p class="text-secondary text-sm mb-6">
            ${searchQuery ? `No articles found matching "${searchQuery}". Try a different keyword.` : 'No articles available in this channel.'}
          </p>
          <button
            id="clear-filter-btn"
            class="btn-interactive cursor-pointer px-5 py-2.5 border border-strong bg-card hover:bg-card-hover rounded-full text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            Reset Search
          </button>
        </div>
      `;

      this.el.querySelector('#clear-filter-btn')?.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('clear-search'));
      });
      return;
    }

    const titleLabel = category.toUpperCase();

    this.el.innerHTML = `
      <div class="mb-6 flex items-center justify-between border-b border-subtle pb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full bg-[#D71921]"></span>
          <h1 class="font-brand text-xl font-bold tracking-wide">${searchQuery ? 'SEARCH' : titleLabel}</h1>
          ${searchQuery ? `<span class="text-xs font-mono text-[#D71921] bg-[#D71921]/10 px-2.5 py-0.5 rounded-full border border-[#D71921]/30 font-medium">"${searchQuery}"</span>` : ''}
        </div>
        <div class="flex items-center gap-3">
          <span class="font-mono text-xs text-muted">${articles.length} STORIES</span>
          ${searchQuery ? `
            <button
              id="clear-search-btn"
              class="btn-interactive cursor-pointer text-xs font-mono text-muted hover:text-[#D71921] flex items-center gap-1 border border-subtle hover:border-[#D71921]/40 rounded-full px-2.5 py-1 transition-colors"
              title="Clear Search"
            >
              <i data-lucide="x" class="w-3 h-3"></i> Clear
            </button>
          ` : ''}
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="articles-grid"></div>
    `;

    this.el.querySelector('#clear-search-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('clear-search'));
    });

    this.renderCardList(articles);
  }

  private renderCardList(articles: Article[]): void {
    const grid = this.el.querySelector('#articles-grid');
    if (!grid) return;

    const currentCat = store.getState().activeCategory || 'top';

    articles.forEach(article => {
      const isSaved = store.getState().bookmarks.some(b => b.link === article.link);
      const timeStr = this.formatRelativeTime(article.pubDate);
      const readTime = article.reading_time_min || 3;

      // Ensure stable fallback image for every article without an image or on broken image load
      const fallbackUrl = getCategoryFallbackImage(currentCat, article.title || article.link);
      const displayImageUrl = article.image_url || fallbackUrl;

      // Clean description: do not render standalone "Comments" text
      const rawDesc = (article.description || '').trim();
      const hasMeaningfulDesc = rawDesc && !/^comments\s*$/i.test(rawDesc) && rawDesc.length > 5;
      const descHtml = hasMeaningfulDesc
        ? `<p class="text-secondary text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed article-text opacity-90">${rawDesc}</p>`
        : `<p class="text-muted text-xs line-clamp-2 mb-4 leading-relaxed article-text italic">Read complete story in reader view.</p>`;

      const card = document.createElement('article');
      card.className = 'w-full card-interactive group relative flex flex-col justify-between rounded-xl border border-subtle bg-card hover:border-strong transition-all duration-300 overflow-hidden cursor-pointer';

      card.innerHTML = `
        <div class="relative w-full aspect-[16/9] overflow-hidden bg-zinc-900 border-b border-subtle">
          <img
            src="${displayImageUrl}"
            alt="${article.title}"
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onerror="if(this.src!=='${fallbackUrl}'){this.src='${fallbackUrl}'}"
          />
          <span class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 font-brand text-[10px] uppercase text-white tracking-wider shadow-sm">
            ${article.source_id}
          </span>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h2 class="article-headline font-semibold text-base sm:text-lg leading-snug group-hover:text-[#D71921] transition-colors mb-2 line-clamp-3">
              ${article.title}
            </h2>
            ${descHtml}
          </div>

          <div class="pt-4 border-t border-subtle flex items-center justify-between text-[11px] font-mono text-muted">
            <div class="flex items-center gap-2">
              <span>${timeStr}</span>
              <span>&bull;</span>
              <span>${readTime} MIN READ</span>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1" onclick="event.stopPropagation()">
              <button
                class="bookmark-action-btn icon-action-btn p-1.5 rounded-md hover:bg-card-hover text-muted hover:text-[#D71921] transition-colors ${isSaved ? 'text-[#D71921]' : ''}"
                title="${isSaved ? 'Remove from Saved' : 'Save Article'}"
              >
                <i data-lucide="${isSaved ? 'bookmark-check' : 'bookmark'}" class="w-4 h-4"></i>
              </button>
              <button
                class="share-action-btn icon-action-btn p-1.5 rounded-md hover:bg-card-hover text-muted hover:text-primary transition-colors"
                title="Share Article"
              >
                <i data-lucide="share-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Pre-warm article reader content on hover or touch before click
      card.addEventListener('pointerenter', () => {
        ApiService.prefetchArticle(article.link);
      }, { passive: true, once: true });

      card.addEventListener('touchstart', () => {
        ApiService.prefetchArticle(article.link);
      }, { passive: true, once: true });

      // Card click opens reader mode
      card.addEventListener('click', () => {
        store.setActiveArticle(article);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // Bookmark button on card
      card.querySelector('.bookmark-action-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const saved = store.toggleBookmark(article);
        Toast.show(saved ? 'Article bookmarked' : 'Bookmark removed', saved ? 'success' : 'info');
      });

      // Share button on card
      card.querySelector('.share-action-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (navigator.share) {
          try {
            await navigator.share({
              title: article.title,
              url: article.link,
            });
          } catch {
            // share cancelled
          }
        } else {
          await navigator.clipboard.writeText(article.link);
          Toast.show('Link copied to clipboard', 'success');
        }
      });

      grid.appendChild(card);
    });

    // Silently pre-warm the lead story in the background
    if (articles.length > 0 && articles[0].link) {
      setTimeout(() => {
        ApiService.prefetchArticle(articles[0].link);
      }, 800);
    }
  }

  private formatRelativeTime(dateStr: string): string {
    try {
      const now = Date.now();
      const time = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - time) / 1000);

      if (isNaN(diffSec)) return 'RECENT';
      if (diffSec < 60) return 'JUST NOW';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}M AGO`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}H AGO`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}D AGO`;

      return new Date(dateStr).toISOString().slice(5, 10).replace('-', '/');
    } catch {
      return 'RECENT';
    }
  }
}
