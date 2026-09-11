import { store } from '../state/store';
import type { CategoryKey } from '../types';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'top', label: 'Headlines' },
  { key: 'technology', label: 'Technology' },
  { key: 'world', label: 'World' },
  { key: 'business', label: 'Business' },
  { key: 'politics', label: 'Politics' },
  { key: 'science', label: 'Science' },
  { key: 'health', label: 'Health' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'sports', label: 'Sports' },
  { key: 'india', label: 'India' },
];

export class Header {
  private el: HTMLElement;
  private searchTimeout: number | null = null;
  private lastScrollY = 0;

  constructor() {
    this.el = document.createElement('header');
    this.el.className = 'sticky top-0 z-30 w-full backdrop-blur-md bg-main/90 border-b border-subtle transition-transform duration-300 ease-out';
    this.render();
    this.setupListeners();
    this.setupScrollHide();
    this.startClock();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private render(): void {
    const state = store.getState();
    const bookmarkCount = state.bookmarks.length;

    this.el.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <!-- Top Bar: Brand, Search, Actions -->
        <div class="flex items-center justify-between gap-2 sm:gap-4">
          <!-- Brand & Clock -->
          <div class="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" id="brand-home">
            <img src="${state.settings.theme === 'light' ? '/assets/logolight.png' : '/assets/logo.png'}" alt="Sednium" class="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md" id="header-logo-img">
            <div class="flex flex-col">
              <span class="font-brand text-base sm:text-2xl font-bold tracking-wider text-primary whitespace-nowrap">SEDNIUM NEWS</span>
              <span class="font-mono text-[10px] text-muted tracking-widest hidden sm:inline" id="live-clock">--:--:-- UTC</span>
            </div>
          </div>

          <!-- Search Bar (Full visibility with ample width and responsive padding) -->
          <div class="flex-1 min-w-[120px] max-w-md mx-1.5 sm:mx-6">
            <div class="relative flex items-center">
              <span class="absolute left-2.5 sm:left-3 text-muted pointer-events-none flex items-center">
                <i data-lucide="search" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
              </span>
              <input
                type="text"
                id="search-input"
                placeholder="Search..."
                aria-label="Search news stories"
                value="${state.searchQuery}"
                class="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 bg-card text-primary placeholder-zinc-500 text-xs sm:text-sm font-sans rounded-full border border-subtle focus:border-[#D71921] focus:outline-none transition-colors"
              />
              <button id="search-clear" aria-label="Clear search" class="absolute right-2 sm:right-2.5 text-muted hover:text-primary ${state.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Quick Actions: Theme toggle always visible; Saved & Settings in header on desktop -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="theme-toggle-header-btn"
              aria-label="${state.settings.theme === 'light' ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode'}"
              title="${state.settings.theme === 'light' ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode'}"
              class="theme-toggle-btn btn-interactive cursor-pointer p-1.5 sm:p-2 rounded-full border border-subtle hover:border-strong text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="${state.settings.theme === 'light' ? 'moon' : 'sun'}" class="theme-toggle-icon w-4 h-4"></i>
            </button>

            <button
              id="saved-header-btn"
              aria-label="View Saved Articles"
              title="Saved Articles"
              class="hidden sm:flex btn-interactive cursor-pointer relative items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle hover:border-strong text-xs font-mono tracking-wider transition-colors ${state.view === 'saved' ? 'border-[#D71921] text-[#D71921] bg-[#D71921]/10' : 'text-primary'}"
            >
              <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
              <span class="hidden md:inline">SAVED</span>
              ${bookmarkCount > 0 ? `<span class="px-1.5 py-0.2 text-[10px] bg-[#D71921] text-white rounded-full font-bold">${bookmarkCount}</span>` : ''}
            </button>

            <button
              id="settings-trigger-btn"
              aria-label="Open Settings"
              aria-controls="settings-drawer-container"
              title="Settings"
              class="hidden sm:flex settings-option-btn btn-interactive cursor-pointer p-2 rounded-full border border-subtle hover:border-strong text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Categories Scroll Strip (Centered on wider viewports) -->
        <nav aria-label="News categories" class="mt-3 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          ${CATEGORIES.map(cat => {
            const isActive = state.view === 'feed' && state.activeCategory === cat.key;
            return `
              <button
                data-category="${cat.key}"
                class="category-pill cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-full border font-mono tracking-wide transition-all ${
                  isActive
                    ? 'border-[#D71921] bg-[#D71921] text-white font-bold shadow-xs'
                    : 'border-subtle bg-card text-secondary hover:text-primary hover:border-strong'
                }"
              >
                ${cat.label.toUpperCase()}
              </button>
            `;
          }).join('')}
        </nav>
      </div>
    `;
  }

  private setupListeners(): void {
    // Brand click returns to Top News
    this.el.querySelector('#brand-home')?.addEventListener('click', () => {
      const searchInput = this.el.querySelector('#search-input') as HTMLInputElement;
      if (searchInput) searchInput.value = '';
      this.el.querySelector('#search-clear')?.classList.add('hidden');
      const hadSearch = Boolean(store.getState().searchQuery);
      store.setCategory('top');
      store.setView('feed');
      store.setActiveArticle(null);
      if (hadSearch) {
        document.dispatchEvent(new CustomEvent('clear-search'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Saved button click
    this.el.querySelector('#saved-header-btn')?.addEventListener('click', () => {
      if (store.getState().view === 'saved') {
        store.setView('feed');
      } else {
        store.setView('saved');
      }
    });

    // Theme toggle button
    this.el.querySelector('#theme-toggle-header-btn')?.addEventListener('click', () => {
      const current = store.getState().settings.theme;
      const nextTheme = current === 'light' ? 'dark' : 'light';
      store.updateSettings({ theme: nextTheme });
    });

    // Settings trigger button
    this.el.querySelector('#settings-trigger-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('toggle-settings'));
    });

    // Search input debounced + Enter trigger
    const searchInput = this.el.querySelector('#search-input') as HTMLInputElement;
    const searchClear = this.el.querySelector('#search-clear') as HTMLButtonElement;

    searchInput?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (searchClear) {
        searchClear.classList.toggle('hidden', !val);
      }

      if (this.searchTimeout) window.clearTimeout(this.searchTimeout);
      this.searchTimeout = window.setTimeout(() => {
        store.setSearchQuery(val);
        if (val.trim().length >= 2) {
          document.dispatchEvent(new CustomEvent('search-news', { detail: { query: val.trim() } }));
        } else if (val.trim().length === 0) {
          document.dispatchEvent(new CustomEvent('clear-search'));
        }
      }, 400);
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (this.searchTimeout) window.clearTimeout(this.searchTimeout);
        if (val.length >= 2) {
          store.setSearchQuery(val);
          document.dispatchEvent(new CustomEvent('search-news', { detail: { query: val } }));
        } else if (val.length === 0) {
          store.setSearchQuery('');
          document.dispatchEvent(new CustomEvent('clear-search'));
        }
      }
    });

    searchClear?.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      if (this.searchTimeout) window.clearTimeout(this.searchTimeout);
      store.setSearchQuery('');
      document.dispatchEvent(new CustomEvent('clear-search'));
      searchInput.focus();
    });

    // Category pills click delegation
    this.el.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category') as CategoryKey;
        if (cat) {
          const hadSearch = Boolean(store.getState().searchQuery);
          if (hadSearch) {
            const searchInput = this.el.querySelector('#search-input') as HTMLInputElement;
            if (searchInput) searchInput.value = '';
            this.el.querySelector('#search-clear')?.classList.add('hidden');
          }
          store.setCategory(cat);
          store.setView('feed');
          store.setActiveArticle(null);
          if (hadSearch) {
            document.dispatchEvent(new CustomEvent('clear-search'));
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Subscribe to store updates to keep category pills, theme button, and count updated
    store.subscribe((state) => {
      // Completely hide header in reader view so reader has full screen with no bleed-through
      if (state.view === 'reader') {
        this.el.style.display = 'none';
        return;
      }
      this.el.style.display = '';
      this.el.style.transform = 'translateY(0)';

      // Sync theme button icon
      const themeBtn = this.el.querySelector('#theme-toggle-header-btn');
      if (themeBtn) {
        const isLight = state.settings.theme === 'light';
        themeBtn.setAttribute('title', isLight ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode');
        themeBtn.innerHTML = `<i data-lucide="${isLight ? 'moon' : 'sun'}" class="theme-toggle-icon w-4 h-4"></i>`;
      }

      // Sync search input if cleared externally
      if (searchInput && searchInput.value !== state.searchQuery) {
        searchInput.value = state.searchQuery;
        if (searchClear) {
          searchClear.classList.toggle('hidden', !state.searchQuery);
        }
      }

      const pills = this.el.querySelectorAll('.category-pill');
      pills.forEach(btn => {
        const cat = btn.getAttribute('data-category');
        const isActive = state.view === 'feed' && state.activeCategory === cat;
        if (isActive) {
          btn.className = 'category-pill cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-full border font-mono tracking-wide border-[#D71921] bg-[#D71921] text-white font-bold shadow-xs';
        } else {
          btn.className = 'category-pill cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-full border font-mono tracking-wide border-subtle bg-card text-secondary hover:text-primary hover:border-strong';
        }
      });

      const savedBtn = this.el.querySelector('#saved-header-btn');
      if (savedBtn) {
        const isSaved = state.view === 'saved';
        savedBtn.className = `relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle hover:border-strong text-xs font-mono tracking-wider transition-colors ${isSaved ? 'border-[#D71921] text-[#D71921] bg-[#D71921]/10' : 'text-primary'}`;
        const countSpan = savedBtn.querySelector('span.rounded-full');
        if (state.bookmarks.length > 0) {
          if (countSpan) {
            countSpan.textContent = String(state.bookmarks.length);
          } else {
            savedBtn.insertAdjacentHTML('beforeend', `<span class="px-1.5 py-0.2 text-[10px] bg-[#D71921] text-white rounded-full font-bold">${state.bookmarks.length}</span>`);
          }
        } else if (countSpan) {
          countSpan.remove();
        }
      }

      if (typeof (window as any).lucide !== 'undefined') {
        (window as any).lucide.createIcons();
      }
    });
  }

  private startClock(): void {
    const clockEl = this.el.querySelector('#live-clock');
    if (!clockEl) return;

    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toUTCString().slice(17, 25);
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '.');
      clockEl.textContent = `${timeStr} UTC // ${dateStr}`;
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  private setupScrollHide(): void {
    window.addEventListener('scroll', () => {
      // Do not run scroll hide while in reader view
      if (store.getState().view === 'reader') return;

      const currentScrollY = window.scrollY;

      if (currentScrollY > 70) {
        if (currentScrollY > this.lastScrollY && currentScrollY - this.lastScrollY > 6) {
          // Scrolling down: hide header dynamically
          this.el.style.transform = 'translateY(-100%)';
        } else if (this.lastScrollY - currentScrollY > 6) {
          // Scrolling up: reveal header smoothly
          this.el.style.transform = 'translateY(0)';
        }
      } else {
        // Near top of page: always reveal
        this.el.style.transform = 'translateY(0)';
      }

      this.lastScrollY = Math.max(0, currentScrollY);
    }, { passive: true });
  }
}
