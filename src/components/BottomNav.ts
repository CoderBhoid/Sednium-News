import { store } from '../state/store';
import { Toast } from './Toast';

export class BottomNav {
  private el: HTMLElement;
  private isSettingsOpen: boolean = false;

  constructor() {
    this.el = document.createElement('nav');
    this.el.id = 'bottom-nav';
    this.el.className = 'sm:hidden fixed bottom-0 left-0 right-0 z-50 liquid-glass-nav px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around text-xs font-mono transition-colors duration-200';
    this.render();
    this.setupListeners();
    this.setupSubscription();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private render(): void {
    const state = store.getState();
    const isFeed = state.view === 'feed' && !this.isSettingsOpen;
    const isReader = state.view === 'reader' && !this.isSettingsOpen;
    const isSaved = state.view === 'saved' && !this.isSettingsOpen;

    this.el.innerHTML = `
      <button
        id="nav-home-btn"
        class="btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isFeed ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}"
        aria-label="Feed"
      >
        <i data-lucide="newspaper" class="w-4 h-4"></i>
        <span class="text-[10px] tracking-wider">FEED</span>
      </button>

      <button
        id="nav-reading-btn"
        class="btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isReader ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}"
        aria-label="Reading"
      >
        <i data-lucide="book-open" class="w-4 h-4"></i>
        <span class="text-[10px] tracking-wider">READING</span>
      </button>

      <button
        id="nav-saved-btn"
        class="btn-interactive cursor-pointer relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isSaved ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}"
        aria-label="Saved"
      >
        <i data-lucide="bookmark" class="w-4 h-4"></i>
        <span class="text-[10px] tracking-wider">SAVED</span>
        <span id="nav-saved-dot" class="${state.bookmarks.length > 0 ? '' : 'hidden'} absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#D71921]"></span>
      </button>

      <button
        id="nav-settings-btn"
        class="btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${this.isSettingsOpen ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}"
        aria-label="Settings"
      >
        <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
        <span class="text-[10px] tracking-wider">SETTINGS</span>
      </button>
    `;

    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  private setupListeners(): void {
    // Listen to settings state change
    document.addEventListener('settings-state-change', (e: any) => {
      this.isSettingsOpen = !!e.detail?.isOpen;
      this.updateActiveStates();
    });

    this.el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const homeBtn = target.closest('#nav-home-btn');
      const readingBtn = target.closest('#nav-reading-btn');
      const savedBtn = target.closest('#nav-saved-btn');
      const settingsBtn = target.closest('#nav-settings-btn');

      if (homeBtn) {
        document.dispatchEvent(new CustomEvent('close-settings'));
        store.setView('feed');
        store.setActiveArticle(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (readingBtn) {
        document.dispatchEvent(new CustomEvent('close-settings'));
        const last = store.getState().lastReadArticle;
        if (last) {
          store.setActiveArticle(last);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Read lead article from home if none was previously opened
          const articles = store.getState().articles;
          if (articles.length > 0) {
            store.setActiveArticle(articles[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            Toast.show('Opened lead story from feed', 'info');
          } else {
            Toast.show('No stories loaded yet', 'info');
          }
        }
      } else if (savedBtn) {
        document.dispatchEvent(new CustomEvent('close-settings'));
        store.setView('saved');
        store.setActiveArticle(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (settingsBtn) {
        document.dispatchEvent(new CustomEvent('toggle-settings'));
      }
    });
  }

  private setupSubscription(): void {
    store.subscribe(() => {
      this.updateActiveStates();
    });
  }

  private updateActiveStates(): void {
    const state = store.getState();
    const isFeed = state.view === 'feed' && !this.isSettingsOpen;
    const isReader = state.view === 'reader' && !this.isSettingsOpen;
    const isSaved = state.view === 'saved' && !this.isSettingsOpen;

    const homeBtn = this.el.querySelector('#nav-home-btn');
    if (homeBtn) {
      homeBtn.className = `btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isFeed ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}`;
    }

    const readingBtn = this.el.querySelector('#nav-reading-btn');
    if (readingBtn) {
      readingBtn.className = `btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isReader ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}`;
    }

    const savedBtn = this.el.querySelector('#nav-saved-btn');
    if (savedBtn) {
      savedBtn.className = `btn-interactive cursor-pointer relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isSaved ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}`;
    }

    const settingsBtn = this.el.querySelector('#nav-settings-btn');
    if (settingsBtn) {
      settingsBtn.className = `btn-interactive cursor-pointer flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${this.isSettingsOpen ? 'text-[#D71921] font-bold bg-[#D71921]/10' : 'text-muted hover:text-primary'}`;
    }

    const dot = this.el.querySelector('#nav-saved-dot');
    if (dot) {
      if (state.bookmarks.length > 0) {
        dot.classList.remove('hidden');
      } else {
        dot.classList.add('hidden');
      }
    }
  }
}
