import { store } from '../state/store';
import type { ThemeMode, FontStyle, SortMode } from '../types';
import { Toast } from './Toast';

export class SettingsDrawer {
  private el: HTMLElement;
  private backdrop: HTMLElement;
  private panel: HTMLElement;
  private isOpen: boolean = false;
  private closeTimeout: number | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'settings-drawer-container';
    this.el.className = 'fixed inset-0 z-40 pointer-events-none invisible transition-opacity duration-300';

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300';

    this.panel = document.createElement('aside');
    this.panel.className = 'fixed inset-0 bottom-16 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:w-full sm:max-w-md bg-main sm:border-l border-subtle shadow-2xl flex flex-col pointer-events-none transform translate-y-[120%] sm:translate-y-0 sm:translate-x-full transition-transform duration-300 overflow-hidden z-40 invisible';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Settings');
    this.panel.setAttribute('aria-modal', 'true');

    this.el.appendChild(this.backdrop);
    this.el.appendChild(this.panel);

    this.render();
    this.setupListeners();
    this.bindStore();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  open(): void {
    if (this.closeTimeout) {
      window.clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.isOpen = true;
    this.el.classList.remove('pointer-events-none', 'invisible');
    this.panel.classList.remove('invisible', 'pointer-events-none');

    // Force layout reflow before triggering slide-in animation
    void this.panel.offsetHeight;

    this.backdrop.classList.remove('pointer-events-none', 'opacity-0');
    this.backdrop.classList.add('opacity-100');
    this.panel.classList.remove('translate-y-[120%]', 'sm:translate-x-full');
    this.panel.classList.add('translate-y-0', 'sm:translate-x-0');
    document.body.style.overflow = 'hidden';

    this.updateSourceList();

    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
    document.dispatchEvent(new CustomEvent('settings-state-change', { detail: { isOpen: true } }));
  }

  close(): void {
    this.isOpen = false;
    this.backdrop.classList.remove('opacity-100');
    this.backdrop.classList.add('opacity-0', 'pointer-events-none');
    this.panel.classList.remove('translate-y-0', 'sm:translate-x-0');
    this.panel.classList.add('translate-y-[120%]', 'sm:translate-x-full', 'pointer-events-none');
    this.el.classList.add('pointer-events-none');
    document.body.style.overflow = '';
    document.dispatchEvent(new CustomEvent('settings-state-change', { detail: { isOpen: false } }));

    if (this.closeTimeout) window.clearTimeout(this.closeTimeout);
    this.closeTimeout = window.setTimeout(() => {
      if (!this.isOpen) {
        this.el.classList.add('invisible');
        this.panel.classList.add('invisible');
      }
    }, 320);
  }

  private render(): void {
    const state = store.getState();
    const { theme, font, warmth, sort, customFeeds } = state.settings;

    this.panel.innerHTML = `
      <!-- Header -->
      <div class="px-6 py-5 border-b border-subtle flex items-center justify-between bg-card/50">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full bg-[#D71921]"></span>
          <h2 class="font-brand text-lg font-bold tracking-wider text-primary">SETTINGS</h2>
        </div>
        <button
          id="close-settings-btn"
          class="p-2 rounded-full border border-subtle hover:border-strong text-muted hover:text-primary transition-colors"
          title="Close Settings"
        >
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Scrollable Settings Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8 text-sm">

        <!-- Appearance Section -->
        <section class="space-y-4">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="palette" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Appearance & Typography</span>
          </div>

          <!-- Theme -->
          <div class="space-y-2">
            <label class="text-xs font-mono text-secondary">THEME PROFILE</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                data-theme="dark"
                class="theme-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${theme !== 'light' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                <i data-lucide="moon" class="w-3.5 h-3.5"></i>
                OLED Dark
              </button>
              <button
                data-theme="light"
                class="theme-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${theme === 'light' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                <i data-lucide="sun" class="w-3.5 h-3.5"></i>
                Light
              </button>
            </div>
          </div>

          <!-- Font Style -->
          <div class="space-y-2 pt-2">
            <label class="text-xs font-mono text-secondary">FONT FAMILY</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                data-font="sans"
                class="font-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-sans tracking-wide transition-colors ${font === 'sans' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                Urbanist
              </button>
              <button
                data-font="serif"
                class="font-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-serif tracking-wide transition-colors ${font === 'serif' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                Editorial
              </button>
              <button
                data-font="ndot"
                class="font-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-brand tracking-wider transition-colors ${font === 'ndot' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                NDOT
              </button>
            </div>
          </div>

          <!-- Display Warmth Slider -->
          <div class="space-y-2 pt-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-secondary">DISPLAY WARMTH</span>
              <span id="warmth-val" class="text-muted">${warmth > 0 ? `+${warmth}` : warmth}</span>
            </div>
            <input
              type="range"
              id="warmth-slider"
              min="-50"
              max="50"
              value="${warmth}"
              class="w-full accent-[#D71921] cursor-pointer bg-zinc-800 rounded-lg h-1.5"
            />
            <div class="flex justify-between text-[10px] font-mono text-muted">
              <span>Cool Blue</span>
              <span>Neutral</span>
              <span>Warm Amber</span>
            </div>
          </div>
        </section>

        <!-- Feed Configuration Section -->
        <section class="space-y-4">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="rss" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Feed & Content Management</span>
          </div>

          <!-- Sort Order -->
          <div class="space-y-2">
            <label class="text-xs font-mono text-secondary">DEFAULT SORT SEQUENCE</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                data-sort="latest"
                class="sort-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${sort === 'latest' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                Latest First
              </button>
              <button
                data-sort="variety"
                class="sort-btn settings-option-btn cursor-pointer py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${sort === 'variety' ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}"
              >
                <i data-lucide="shuffle" class="w-3.5 h-3.5"></i>
                Variety Mix
              </button>
            </div>
          </div>

          <!-- Custom Feeds Manager -->
          <div class="space-y-2 pt-2">
            <label class="text-xs font-mono text-secondary">ADD CUSTOM RSS FEED</label>
            <div class="flex gap-2">
              <input
                type="url"
                id="custom-feed-input"
                placeholder="https://site.com/feed.xml"
                class="flex-1 px-3 py-2 bg-card border border-subtle rounded-lg text-xs font-mono text-primary placeholder-zinc-500 focus:border-[#D71921] focus:outline-none"
              />
              <button
                id="add-feed-btn"
                class="btn-interactive cursor-pointer px-4 py-2 bg-[#D71921] hover:bg-[#b5141b] text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                ADD
              </button>
            </div>

            <!-- Custom Feeds List -->
            <div id="custom-feeds-list" class="space-y-1.5 mt-3 max-h-36 overflow-y-auto">
              ${customFeeds.length === 0 ? `
                <div class="text-[11px] font-mono text-muted text-center py-2 border border-dashed border-subtle rounded-lg">
                  No custom feeds registered
                </div>
              ` : customFeeds.map(feed => `
                <div class="flex items-center justify-between gap-2 p-2 bg-card border border-subtle rounded-lg text-xs font-mono">
                  <span class="truncate text-secondary" title="${feed}">${feed}</span>
                  <button data-remove-feed="${feed}" class="icon-action-btn cursor-pointer text-muted hover:text-[#D71921] p-1 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `).join('')}
            </div>

            <!-- Quick-Test Verified RSS Feeds Strip -->
            <div class="space-y-1.5 pt-2">
              <span class="text-[10px] font-mono text-muted uppercase tracking-wider">Quick-Test Feeds:</span>
              <div class="flex flex-wrap gap-1.5">
                ${[
                  { label: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
                  { label: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
                  { label: 'NASA', url: 'https://www.nasa.gov/news-release/feed/' },
                  { label: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
                  { label: 'Hacker News', url: 'https://news.ycombinator.com/rss' }
                ].map(p => `
                  <button
                    data-quick-feed="${p.url}"
                    class="quick-feed-btn btn-interactive cursor-pointer px-2 py-1 rounded-md bg-card hover:bg-card-hover border border-subtle hover:border-[#D71921] text-[10px] font-mono text-secondary hover:text-primary transition-colors flex items-center gap-1"
                    title="Add & Test ${p.label}"
                  >
                    <i data-lucide="rss" class="w-2.5 h-2.5 text-[#D71921]"></i>
                    <span>+ ${p.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Source Filter Checkboxes -->
          <div class="space-y-2 pt-2">
            <label class="text-xs font-mono text-secondary">FILTER BY PUBLISHER</label>
            <p class="text-[11px] text-muted">Toggle publishers in the active category to customize your feed view.</p>
            <div id="source-filter-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              <!-- Dynamically populated -->
            </div>
          </div>
        </section>

        <!-- Official Feeds Copy Section -->
        <section class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="radio" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Export RSS Endpoints</span>
          </div>
          <p class="text-[11px] text-muted">Subscribe to Sednium channels in your personal feed reader (Feedly, NetNewsWire, Smart Launcher):</p>
          <div class="space-y-1.5 text-xs font-mono">
            ${[
              { name: 'Top Headlines', path: '/rss' },
              { name: 'Technology', path: '/rss/technology' },
              { name: 'World', path: '/rss/world' },
              { name: 'Science', path: '/rss/science' },
              { name: 'Business', path: '/rss/business' },
              { name: 'India', path: '/rss/india' }
            ].map(f => `
              <div class="flex items-center justify-between p-2 bg-card border border-subtle rounded-lg">
                <span class="text-secondary">${f.name}</span>
                <button
                  data-copy-feed="${f.path}"
                  class="btn-interactive cursor-pointer text-xs text-[#D71921] hover:underline flex items-center gap-1"
                >
                  ${f.path}
                  <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Community & Discussion Forums Section -->
        <section class="space-y-3 pt-2">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Community & Forums</span>
          </div>
          <p class="text-[11px] text-muted">Discuss news feeds, request features, or participate in open community forums:</p>
          <div class="space-y-2 font-mono text-xs">
            <a
              href="https://github.com/CoderBhoid/Sednium-News/discussions"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-interactive flex items-center justify-between p-2.5 rounded-lg border border-subtle hover:border-strong bg-card hover:text-[#D71921] transition-colors"
            >
              <div class="flex items-center gap-2">
                <i data-lucide="message-square" class="w-4 h-4 text-[#D71921]"></i>
                <span>Sednium News Discussions Forum</span>
              </div>
              <i data-lucide="external-link" class="w-3.5 h-3.5 text-muted"></i>
            </a>

            <a
              href="https://github.com/CoderBhoid/Sednium-News/issues"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-interactive flex items-center justify-between p-2.5 rounded-lg border border-subtle hover:border-strong bg-card hover:text-[#D71921] transition-colors"
            >
              <div class="flex items-center gap-2">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-[#D71921]"></i>
                <span>Report Issue / Bug Tracker</span>
              </div>
              <i data-lucide="external-link" class="w-3.5 h-3.5 text-muted"></i>
            </a>
          </div>
        </section>

        <!-- Privacy & Compliance Section -->
        <section class="space-y-3 pt-2">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Privacy & Compliance</span>
          </div>
          <div class="p-3.5 rounded-xl border border-subtle bg-card/60 space-y-2.5">
            <p class="text-xs text-secondary leading-relaxed">
              Sednium News uses zero third-party trackers or advertising cookies. All preferences are preserved strictly inside your browser.
            </p>
            <button
              id="open-privacy-policy-btn"
              class="btn-interactive w-full cursor-pointer flex items-center justify-between p-2.5 rounded-lg border border-subtle hover:border-strong bg-main text-xs font-mono text-primary hover:text-[#D71921] transition-colors"
            >
              <div class="flex items-center gap-2">
                <i data-lucide="shield-check" class="w-4 h-4 text-[#D71921]"></i>
                <span>Privacy & Cookie Policy</span>
              </div>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-muted"></i>
            </button>
          </div>
        </section>

        <!-- Creator & Ecosystem Showcase Section -->
        <section class="space-y-4 pt-2">
          <div class="flex items-center gap-2 text-xs font-mono uppercase text-muted tracking-widest border-b border-subtle pb-2">
            <i data-lucide="user" class="w-3.5 h-3.5 text-[#D71921]"></i>
            <span>Creator & Ecosystem</span>
          </div>

          <div class="p-4 rounded-xl border border-subtle bg-card/60 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-brand text-base font-bold text-primary">BHOID</h3>
                <span class="text-xs font-mono text-muted">Architect & Systems Developer</span>
              </div>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System Online"></span>
            </div>

            <p class="text-xs text-secondary leading-relaxed article-text">
              Crafted as a distraction-free news portal with an industrial aesthetic, eliminating paywalls, popups, and tracker overhead.
            </p>

            <div class="pt-2 flex flex-col gap-2 font-mono text-xs">
              <a
                href="https://bhoid.sednium.com"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-interactive flex items-center justify-between p-2.5 rounded-lg border border-subtle hover:border-strong bg-main hover:text-[#D71921] transition-colors"
              >
                <div class="flex items-center gap-2">
                  <i data-lucide="globe" class="w-4 h-4 text-[#D71921]"></i>
                  <span>bhoid.sednium.com</span>
                </div>
                <i data-lucide="external-link" class="w-3.5 h-3.5 text-muted"></i>
              </a>

              <a
                href="https://github.com/CoderBhoid"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-interactive flex items-center justify-between p-2.5 rounded-lg border border-subtle hover:border-strong bg-main hover:text-[#D71921] transition-colors"
              >
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 fill-current text-[#D71921]" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>github.com/CoderBhoid</span>
                </div>
                <i data-lucide="external-link" class="w-3.5 h-3.5 text-muted"></i>
              </a>

              <a
                href="https://sednium.com"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-interactive flex items-center justify-between p-2.5 rounded-lg border border-[#D71921]/40 hover:border-[#D71921] bg-[#D71921]/10 text-primary transition-colors font-bold"
              >
                <div class="flex items-center gap-2">
                  <i data-lucide="sparkles" class="w-4 h-4 text-[#D71921]"></i>
                  <span>More Projects at Sednium</span>
                </div>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-[#D71921]"></i>
              </a>
            </div>
          </div>
        </section>

        <!-- Version & License Footer -->
        <div class="pt-4 text-center text-xs font-mono text-muted space-y-1 pb-4">
          <div>SEDNIUM NEWS // v3</div>
          <div class="flex items-center justify-center gap-2">
            <span>MIT LICENSE</span> &bull;
            <span>OPEN SOURCE</span> &bull;
            <button id="footer-privacy-link" class="underline hover:text-[#D71921] cursor-pointer">PRIVACY & COOKIES</button>
          </div>
        </div>

      </div>
    `;
  }

  private setupListeners(): void {
    // Backdrop click
    this.backdrop.addEventListener('click', () => this.close());

    // Close button
    this.panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('#close-settings-btn')) {
        this.close();
      }
    });

    // Toggle custom event listener
    document.addEventListener('toggle-settings', () => {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    document.addEventListener('close-settings', () => {
      if (this.isOpen) {
        this.close();
      }
    });

    // Theme buttons
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.theme-btn') as HTMLElement;
      if (btn) {
        const theme = btn.getAttribute('data-theme') as ThemeMode;
        if (theme) {
          store.updateSettings({ theme });
          this.refreshThemeButtons(theme);
        }
      }
    });

    // Font buttons
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.font-btn') as HTMLElement;
      if (btn) {
        const font = btn.getAttribute('data-font') as FontStyle;
        if (font) {
          store.updateSettings({ font });
          this.refreshFontButtons(font);
        }
      }
    });

    // Sort buttons
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.sort-btn') as HTMLElement;
      if (btn) {
        const sort = btn.getAttribute('data-sort') as SortMode;
        if (sort) {
          store.updateSettings({ sort });
          this.refreshSortButtons(sort);
          Toast.show(`Feed sorted by ${sort === 'latest' ? 'newest' : 'variety'}`, 'info');
        }
      }
    });

    // Display warmth slider
    this.panel.addEventListener('input', (e) => {
      const slider = (e.target as HTMLElement).closest('#warmth-slider') as HTMLInputElement;
      if (slider) {
        const val = parseInt(slider.value, 10);
        const valEl = this.panel.querySelector('#warmth-val');
        if (valEl) valEl.textContent = val > 0 ? `+${val}` : `${val}`;
        store.updateSettings({ warmth: val });
      }
    });

    // Add custom feed
    this.panel.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#add-feed-btn')) {
        const input = this.panel.querySelector('#custom-feed-input') as HTMLInputElement;
        if (input && input.value.trim()) {
          const success = store.addCustomFeed(input.value.trim());
          if (success) {
            Toast.show('Custom feed added', 'success');
            input.value = '';
            this.renderCustomFeedsList();
          } else {
            Toast.show('Invalid or duplicate RSS URL', 'alert');
          }
        }
      }
    });

    // Remove custom feed
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-remove-feed]') as HTMLElement;
      if (btn) {
        const feedUrl = btn.getAttribute('data-remove-feed');
        if (feedUrl) {
          store.removeCustomFeed(feedUrl);
          Toast.show('Feed removed', 'info');
          this.renderCustomFeedsList();
        }
      }
    });

    // Copy official feed links
    this.panel.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('[data-copy-feed]') as HTMLElement;
      if (btn) {
        const path = btn.getAttribute('data-copy-feed');
        if (path) {
          const fullUrl = `${window.location.origin}${path}`;
          await navigator.clipboard.writeText(fullUrl);
          Toast.show(`Copied: ${path}`, 'success');
        }
      }
    });

    // Quick-test verified RSS feeds
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.quick-feed-btn') as HTMLElement;
      if (btn) {
        const feedUrl = btn.getAttribute('data-quick-feed');
        if (feedUrl) {
          const added = store.addCustomFeed(feedUrl);
          if (added) {
            Toast.show('Verified test feed added', 'success');
            this.renderCustomFeedsList();
          } else {
            Toast.show('Feed already in your channels', 'info');
          }
        }
      }
    });

    // Privacy & Cookie Policy modal triggers
    this.panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('#open-privacy-policy-btn') || target.closest('#footer-privacy-link')) {
        document.dispatchEvent(new CustomEvent('open-privacy-policy'));
      }
    });

    // Source filter toggles
    this.panel.addEventListener('change', (e) => {
      const checkbox = (e.target as HTMLElement).closest('.source-filter-checkbox') as HTMLInputElement;
      if (checkbox) {
        const source = checkbox.value;
        store.toggleSourceExclusion(source);
      }
    });
  }

  private bindStore(): void {
    store.subscribe((state) => {
      this.updateSourceList(state.detectedSources, state.settings.excludedSources);
    });
  }

  private refreshThemeButtons(activeTheme: ThemeMode): void {
    this.panel.querySelectorAll('.theme-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-theme') === activeTheme;
      btn.className = `theme-btn py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${isCurrent ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}`;
    });
  }

  private refreshFontButtons(activeFont: FontStyle): void {
    this.panel.querySelectorAll('.font-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-font') === activeFont;
      btn.className = `font-btn py-2 px-3 rounded-lg border text-xs tracking-wide transition-colors ${isCurrent ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}`;
    });
  }

  private refreshSortButtons(activeSort: SortMode): void {
    this.panel.querySelectorAll('.sort-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-sort') === activeSort;
      btn.className = `sort-btn py-2 px-3 rounded-lg border text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors ${isCurrent ? 'border-[#D71921] bg-[#D71921]/15 text-primary' : 'border-subtle bg-card text-secondary hover:text-primary'}`;
    });
  }

  private renderCustomFeedsList(): void {
    const list = this.panel.querySelector('#custom-feeds-list');
    if (!list) return;

    const feeds = store.getState().settings.customFeeds;
    if (feeds.length === 0) {
      list.innerHTML = `
        <div class="text-[11px] font-mono text-muted text-center py-2 border border-dashed border-subtle rounded-lg">
          No custom feeds registered
        </div>
      `;
      return;
    }

    list.innerHTML = feeds.map(feed => `
      <div class="flex items-center justify-between gap-2 p-2 bg-card border border-subtle rounded-lg text-xs font-mono">
        <span class="truncate text-secondary" title="${feed}">${feed}</span>
        <button data-remove-feed="${feed}" class="text-muted hover:text-[#D71921] p-1 transition-colors">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `).join('');

    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  private updateSourceList(sources?: string[], excluded?: string[]): void {
    const container = this.panel.querySelector('#source-filter-container');
    if (!container) return;

    const activeSources = sources || store.getState().detectedSources;
    const activeExcluded = new Set(excluded || store.getState().settings.excludedSources);

    if (activeSources.length === 0) {
      container.innerHTML = `
        <div class="text-[11px] font-mono text-muted text-center py-2">
          No publishers detected in active category
        </div>
      `;
      return;
    }

    container.innerHTML = activeSources.map(src => {
      const isChecked = !activeExcluded.has(src);
      return `
        <label class="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-subtle hover:border-strong cursor-pointer text-xs font-mono">
          <span class="truncate text-secondary">${src}</span>
          <input
            type="checkbox"
            value="${src}"
            class="source-filter-checkbox accent-[#D71921] rounded"
            ${isChecked ? 'checked' : ''}
          />
        </label>
      `;
    }).join('');
  }
}
