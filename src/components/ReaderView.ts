import { store } from '../state/store';
import { ApiService } from '../services/api';
import { SpeechService } from '../services/speech';
import { Toast } from './Toast';
import DOMPurify from 'dompurify';
import type { Article } from '../types';
import { getCategoryFallbackImage } from '../utils/fallbackImages';

export class ReaderView {
  private el: HTMLElement;
  private progressBar: HTMLElement | null = null;
  private currentSpeechRate = 1.0;
  private speechSubscription: (() => void) | null = null;
  private clockInterval: number | null = null;
  private streamRafId: number | null = null;
  private cancelCurrentStream: (() => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'reader-container';
    this.el.className = 'hidden min-h-screen bg-main transition-colors duration-200';
    this.setupSubscription();
    this.setupScrollListener();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private setupSubscription(): void {
    store.subscribe((state) => {
      if (state.view !== 'reader' || !state.activeArticle) {
        this.el.classList.add('hidden');
        SpeechService.stop();
        if (this.cancelCurrentStream) {
          this.cancelCurrentStream();
          this.cancelCurrentStream = null;
        }
        if (this.streamRafId) {
          cancelAnimationFrame(this.streamRafId);
          this.streamRafId = null;
        }
        if (this.clockInterval) {
          clearInterval(this.clockInterval);
          this.clockInterval = null;
        }
        document.title = 'Sednium News';
        const dynamicLd = document.getElementById('article-jsonld');
        if (dynamicLd) dynamicLd.remove();
        return;
      }

      this.el.classList.remove('hidden');
      document.title = `${state.activeArticle.title} — Sednium News`;
      this.injectArticleSchema(state.activeArticle);
      this.render(state.activeArticle);
    });
  }

  private injectArticleSchema(article: Article): void {
    let script = document.getElementById('article-jsonld') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'article-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': article.description,
      'datePublished': article.pubDate,
      'dateModified': article.pubDate,
      'mainEntityOfPage': article.link,
      'image': article.image_url ? [article.image_url] : undefined,
      'author': article.creator && article.creator[0]
        ? [{ '@type': 'Person', 'name': article.creator[0] }]
        : [{ '@type': 'Organization', 'name': article.source_id }],
      'publisher': {
        '@type': 'NewsMediaOrganization',
        'name': 'Sednium News',
        'url': 'https://news.sednium.com/'
      }
    };

    script.textContent = JSON.stringify(schema);
  }

  private setupScrollListener(): void {
    window.addEventListener('scroll', () => {
      if (!this.progressBar || store.getState().view !== 'reader') return;
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      this.progressBar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
    }, { passive: true });
  }

  private async render(article: Article): Promise<void> {
    const isBookmarked = store.getState().bookmarks.some(b => b.link === article.link);
    const pubDateFormatted = this.formatDate(article.pubDate);
    const currentCat = (store.getState().activeCategory || 'top').toUpperCase();

    this.el.innerHTML = `
      <!-- Solid Sticky Reading Action Header (No bleed-through, with requested Brand and Clock) -->
      <div class="sticky top-0 z-40 w-full bg-main border-b border-subtle shadow-xs transition-colors duration-200">
        <div id="reading-progress-bar" class="h-0.5 bg-[#D71921] w-0 transition-all duration-150"></div>
        <div class="relative w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          <!-- Left: Brand Logo/Title with Live Clock FIRST, then Back Button -->
          <div class="flex items-center gap-2 sm:gap-3 shrink-0">
            <!-- Brand Logo & Live Clock Requested by User FIRST (aligned to left) -->
            <div class="flex items-center gap-2 cursor-pointer" id="reader-brand-home" title="Return to Feed">
              <img src="${store.getState().settings.theme === 'light' ? '/assets/logolight.png' : '/assets/logo.png'}" alt="Sednium" class="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md" id="reader-logo-img">
              <div class="flex flex-col">
                <span class="font-brand text-sm sm:text-base font-bold tracking-wider text-primary leading-tight">SEDNIUM NEWS</span>
                <span class="font-mono text-[9px] sm:text-[10px] text-muted tracking-tight leading-none mt-0.5 hidden sm:inline" id="reader-live-clock">--:--:-- UTC // ----.--.--</span>
              </div>
            </div>

            <!-- Desktop Back Button (On phones/Android users navigate via Bottom Nav) -->
            <button
              id="reader-back-btn"
              aria-label="Return to Headlines"
              class="hidden sm:flex btn-interactive btn-back cursor-pointer items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-subtle hover:border-strong text-xs font-mono tracking-wider transition-colors text-primary ml-1"
              title="Return to Headlines"
            >
              <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
              <span>BACK</span>
            </button>
          </div>

          <!-- Middle / Dropping Notch: Audio Player Controls -->
          <!-- On Desktop: Centered audio pill. On Mobile / Android: Drops seamlessly from the top bar as an iPhone 10 notch -->
          <div
            id="tts-player-container"
            class="reader-notch-container sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:mt-0 sm:bg-card sm:border sm:border-subtle sm:rounded-full sm:px-3 sm:py-1 sm:shadow-xs z-30"
            role="region"
            aria-label="Audio Reader Controls"
          >
            <!-- Left Concave Ear (mobile only iPhone 10 seamless fillet) -->
            <svg class="sm:hidden absolute -left-[10px] top-0 w-[10px] h-[10px] pointer-events-none" viewBox="0 0 10 10" fill="none">
              <path d="M0 0 C 5 0, 10 5, 10 10 L 10 0 Z" fill="var(--bg-main)" />
              <path d="M0 0.5 C 5 0.5, 9.5 5, 9.5 10" stroke="var(--border-subtle)" stroke-width="1" fill="none" />
            </svg>

            <button
              id="tts-play-btn"
              aria-label="Listen to Article"
              title="Listen to Article"
              class="btn-interactive cursor-pointer flex items-center gap-1 text-xs font-mono text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="volume-2" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
              <span id="tts-label" class="tracking-wider">LISTEN</span>
            </button>

            <span class="text-subtle text-xs" aria-hidden="true">|</span>

            <button
              id="tts-speed-btn"
              aria-label="Change Audio Playback Speed"
              title="Playback Speed"
              class="btn-interactive cursor-pointer text-[10px] font-mono text-muted hover:text-primary px-1 transition-colors"
            >
              1.0X
            </button>

            <button
              id="tts-stop-btn"
              aria-label="Stop Audio"
              title="Stop Audio"
              class="btn-interactive cursor-pointer text-muted hover:text-[#D71921] hidden transition-colors"
            >
              <i data-lucide="square" class="w-3 h-3"></i>
            </button>

            <!-- Right Concave Ear (mobile only iPhone 10 seamless fillet) -->
            <svg class="sm:hidden absolute -right-[10px] top-0 w-[10px] h-[10px] pointer-events-none" viewBox="0 0 10 10" fill="none">
              <path d="M10 0 C 5 0, 0 5, 0 10 L 0 0 Z" fill="var(--bg-main)" />
              <path d="M10 0.5 C 5 0.5, 0.5 5, 0.5 10" stroke="var(--border-subtle)" stroke-width="1" fill="none" />
            </svg>
          </div>

          <!-- Right: Theme Toggle, Bookmark, Share & Source Link -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              id="reader-theme-toggle-btn"
              aria-label="${store.getState().settings.theme === 'light' ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode'}"
              title="${store.getState().settings.theme === 'light' ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode'}"
              class="theme-toggle-btn btn-interactive cursor-pointer p-2 rounded-full border border-subtle hover:border-strong text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="${store.getState().settings.theme === 'light' ? 'moon' : 'sun'}" class="theme-toggle-icon w-4 h-4"></i>
            </button>

            <button
              id="reader-bookmark-btn"
              aria-label="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}"
              title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}"
              class="icon-action-btn p-2 rounded-full border border-subtle hover:border-strong transition-colors ${isBookmarked ? 'border-[#D71921] text-[#D71921]' : 'text-primary'}"
            >
              <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}" class="w-4 h-4"></i>
            </button>

            <button
              id="reader-share-btn"
              aria-label="Share Article"
              title="Share Article"
              class="icon-action-btn p-2 rounded-full border border-subtle hover:border-strong text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="share-2" class="w-4 h-4"></i>
            </button>

            <a
              href="${article.link}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original article at source"
              title="Open at Source"
              class="icon-action-btn p-2 rounded-full border border-subtle hover:border-strong text-primary hover:text-[#D71921] transition-colors"
            >
              <i data-lucide="external-link" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Article Main Container (pt-14 on mobile so dropping notch has clear breathing room; pb-32 for bottom nav) -->
      <article class="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-32 sm:py-10 sm:pb-24">
        <!-- Metadata Header -->
        <div class="mb-8 border-b border-subtle pb-8">
          <div class="flex items-center gap-3 mb-4">
            <a
              href="${article.link}"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit source article on ${article.source_id}"
              class="btn-interactive cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card hover:bg-card-hover border border-subtle hover:border-[#D71921] font-brand text-xs uppercase text-[#D71921] tracking-wider shadow-xs transition-all group"
            >
              <span>${article.source_id}</span>
              <i data-lucide="external-link" class="w-3 h-3 text-[#D71921] opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform"></i>
            </a>
            <span class="text-muted text-xs font-mono">${pubDateFormatted}</span>
          </div>

          <h1 class="text-2xl sm:text-4xl font-bold article-headline tracking-tight text-primary leading-tight mb-4">
            ${article.title}
          </h1>

          <div class="flex flex-wrap items-center gap-4 text-xs font-mono text-muted">
            ${article.creator && article.creator[0] ? `<span>BY ${article.creator[0].toUpperCase()}</span> <span>&bull;</span>` : ''}
            <span id="reading-time-badge">${article.reading_time_min || 3} MIN READ</span>
          </div>
        </div>

        <!-- Featured Image -->
        ${article.image_url ? `
          <div class="mb-10 rounded-2xl overflow-hidden border border-subtle bg-card">
            <img src="${article.image_url}" alt="" class="w-full max-h-[480px] object-cover" />
          </div>
        ` : ''}

        <!-- Dynamic Article Content -->
        <div id="article-body-content" class="article-prose text-primary relative min-h-[220px]">
          <div id="reader-loader-card" class="py-14 flex flex-col items-center justify-center gap-3.5 transition-all duration-300">
            <div id="reader-loader-icon" class="relative w-10 h-10 flex items-center justify-center">
              <div id="reader-spinner" class="w-8 h-8 border-2 border-zinc-700 border-t-[#D71921] rounded-full animate-spin"></div>
            </div>
            <span id="reader-loader-status" class="font-mono text-xs text-muted uppercase tracking-wider transition-colors duration-200">
              Extracting readable content...
            </span>
          </div>
        </div>

        <!-- Recommended Stories Section -->
        <div class="mt-16 pt-10 border-t border-subtle" id="recommended-stories-section">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#D71921]"></span>
              <h2 class="font-brand text-lg sm:text-xl font-bold tracking-wide">RECOMMENDED STORIES</h2>
            </div>
            <span class="font-mono text-xs text-muted uppercase">${currentCat}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="recommended-stories-grid"></div>
        </div>

        <!-- End of Article Footer -->
        <div class="mt-12 pt-8 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-xs font-mono text-muted">
            ORIGIN: <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="underline hover:text-[#D71921]">${new URL(article.link).hostname}</a>
          </div>
          <button
            id="reader-bottom-back-btn"
            class="hidden sm:inline-flex btn-interactive cursor-pointer px-6 py-2.5 bg-card hover:bg-card-hover border border-strong rounded-full text-xs font-mono uppercase tracking-wider transition-colors items-center gap-2"
          >
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            Return to Feed
          </button>
        </div>
      </article>
    `;

    this.progressBar = this.el.querySelector('#reading-progress-bar');
    this.startReaderClock();
    this.setupReaderActions(article);
    this.renderRecommendedStories(article);

    // Animate article headline with photographic lens focus
    const titleEl = this.el.querySelector('.article-headline') as HTMLElement;
    if (titleEl) {
      this.animateLensElement(titleEl);
    }

    // Fetch and render reader body
    this.loadArticleContent(article);

    // Refresh icons
    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  private async loadArticleContent(article: Article): Promise<void> {
    const bodyContainer = this.el.querySelector('#article-body-content') as HTMLElement;
    if (!bodyContainer) return;

    if (this.cancelCurrentStream) {
      this.cancelCurrentStream();
      this.cancelCurrentStream = null;
    }
    if (this.streamRafId) {
      cancelAnimationFrame(this.streamRafId);
      this.streamRafId = null;
    }

    try {
      const data = await ApiService.readArticle(article.link);

      if (data.readingTimeMin) {
        const badge = this.el.querySelector('#reading-time-badge');
        if (badge) badge.textContent = `${data.readingTimeMin} MIN READ`;
      }

      // Clean extracted article HTML & extract clean speech text
      let cleanedText = data.textContent || '';
      let cleanedHtml = data.content || '';
      if (data.content) {
        const cleaned = this.cleanArticleHtml(data.content);
        cleanedHtml = cleaned.html;
        cleanedText = cleaned.text || data.textContent || '';
      }

      // 1. Immediately store clean text in background and connect speech synthesis
      const fullSpeechText = `${article.title}. ${cleanedText || article.description || ''}`;
      this.bindSpeechHandlers(fullSpeechText);

      // 2. Morph spinner into verified checkmark
      const loaderCard = this.el.querySelector('#reader-loader-card') as HTMLElement;
      const loaderIcon = this.el.querySelector('#reader-loader-icon') as HTMLElement;
      const loaderStatus = this.el.querySelector('#reader-loader-status') as HTMLElement;

      if (loaderIcon && loaderStatus) {
        loaderIcon.innerHTML = `
          <svg class="w-9 h-9 text-emerald-500 transition-all duration-300 transform scale-110" viewBox="0 0 36 36">
            <circle class="animate-checkmark-circle" cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="2.5" />
            <path class="animate-checkmark-check" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M11 18.5l5 5 9.5-10" />
          </svg>
        `;
        loaderStatus.className = 'font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider transition-colors duration-200';
        loaderStatus.textContent = 'Content Stored // Signal Acquired';
      }

      // Hold checkmark briefly for visual satisfaction
      await new Promise(r => setTimeout(r, 360));

      // Fade out loader smoothly
      if (loaderCard) {
        loaderCard.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');
      }
      await new Promise(r => setTimeout(r, 200));

      if (cleanedHtml) {
        // Sanitize extracted HTML using DOMPurify
        const sanitized = DOMPurify.sanitize(cleanedHtml, {
          USE_PROFILES: { html: true },
          ALLOWED_TAGS: ['p', 'h2', 'h3', 'h4', 'blockquote', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class']
        });

        // 3. Initiate smooth streaming text arrival
        this.streamArticleContent(bodyContainer, sanitized);
      } else {
        this.renderFallbackArticle(bodyContainer, article);
      }
    } catch {
      this.renderFallbackArticle(bodyContainer, article);
    }
  }

  /**
   * Filter algorithm to eliminate Ad Feedback, READ MORE, ad containers,
   * and cross-promotional teaser links from article DOM.
   */
  private cleanArticleDom(rootElement: HTMLElement): void {
    if (!rootElement) return;

    const JUNK_SELECTORS = [
      '[class*="ad-feedback" i]',
      '[id*="ad-feedback" i]',
      '[class*="ad-banner" i]',
      '[class*="ad-container" i]',
      '[class*="ad-wrapper" i]',
      '[class*="ad-slot" i]',
      '[class*="adunit" i]',
      '[class*="advertisement" i]',
      '[class*="sponsored" i]',
      '[class*="taboola" i]',
      '[class*="outbrain" i]',
      '[class*="newsletter" i]',
      '[class*="social-share" i]',
      '[aria-label*="advertisement" i]',
      '[aria-label*="ad feedback" i]',
      '.ad',
      '.ads',
      '.advert',
      '[data-ad]',
      '[data-advertisement]'
    ];

    const JUNK_TEXT_PATTERNS = [
      /^ad\s*feedback$/i,
      /^advertisement(s)?$/i,
      /^advertising$/i,
      /^sponsored(\s+(content|post|story|stories|article|links?))?$/i,
      /^promoted(\s+(content|post|story|stories|links?))?$/i,
      /^read\s*more[:\s\.\-—–»>]*$/i,
      /^(also\s*read|read\s*also)[:\s\.\-—–»>]*$/i,
      /^(related\s*stories|related\s*articles?|related\s*news|more\s*stories)[:\s\.\-—–»>]*$/i,
      /^(trending\s*now|trending\s*stories|popular\s*stories|latest\s*stories)[:\s\.\-—–»>]*$/i,
      /^(watch\s*now|watch\s*live|listen\s*now)[:\s\.\-—–»>]*$/i,
      /^(sign\s*up\s*for|subscribe\s*to)\s*(our\s*)?(newsletter|daily\s*briefing|updates)?[:\s\.\-—–»>]*$/i,
      /^(click\s*here\s*to\s*subscribe|subscribe\s*now|support\s*independent\s*journalism)[:\s\.\-—–»>]*$/i,
      /^(give\s*feedback|report\s*(this\s*)?ad|about\s*(our\s*)?ads)$/i,
      /^(story\s*continues\s*below(\s*advertisement)?|continue\s*reading(\s*below)?)$/i,
      /^(share\s*(this\s*)?(story|article|post)?|follow\s*us(\s*on\s*[a-z\s]+)?)$/i
    ];

    const CROSS_PROMO_PREFIX_PATTERN = /^(read\s*more|also\s*read|read\s*also|see\s*also|more\s*from|related\s*(story|stories|articles?|coverage)|trending\s*(story|stories|now)|check\s*out|watch\s*now)[:\s\.\-—–»>]+/i;

    // 1. Selector-based cleanup of ad containers and feedback elements
    for (const selector of JUNK_SELECTORS) {
      try {
        rootElement.querySelectorAll(selector).forEach(el => el.remove());
      } catch {
        // ignore
      }
    }

    // 2. Scan block and inline elements for junk text & teaser links
    const candidates = Array.from(rootElement.querySelectorAll('p, div, span, h2, h3, h4, h5, h6, li, aside, section, blockquote, a, em, strong')) as HTMLElement[];
    for (const el of candidates) {
      if (!el.parentNode) continue;
      const text = el.textContent ? el.textContent.trim() : '';

      // Exact or near-exact ad/boilerplate text
      if (JUNK_TEXT_PATTERNS.some(pat => pat.test(text))) {
        el.remove();
        continue;
      }

      // Cross-promotional teaser links (e.g. "READ MORE: Next story...")
      if (text.length < 160 && CROSS_PROMO_PREFIX_PATTERN.test(text)) {
        if (el.tagName.toLowerCase() === 'a' || el.querySelector('a') || el.closest('a')) {
          el.remove();
          continue;
        }
      }
    }

    // 3. Prune empty parent wrappers (paragraphs or divs left empty after purging)
    let changed = true;
    let passes = 0;
    while (changed && passes < 4) {
      changed = false;
      passes++;
      rootElement.querySelectorAll('p, div, span, li, section, aside, blockquote').forEach(el => {
        if (el.querySelector('img, figure, picture, video')) return;
        const t = el.textContent ? el.textContent.replace(/[\u00A0\s]+/g, '').trim() : '';
        if (t.length === 0 && el.children.length === 0) {
          el.remove();
          changed = true;
        }
      });
    }
  }

  private cleanArticleHtml(rawHtml: string): { html: string; text: string } {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    this.cleanArticleDom(tempDiv);
    const paragraphs = Array.from(tempDiv.querySelectorAll('p, h2, h3, h4, blockquote, li'));
    const text = paragraphs.length > 0
      ? paragraphs.map(p => p.textContent?.trim() || '').filter(Boolean).join('\n\n')
      : tempDiv.textContent?.trim() || '';
    return {
      html: tempDiv.innerHTML,
      text
    };
  }

  /**
   * Tokenize text nodes inside an element into individual word spans,
   * preserving all nested formatting, links, and whitespace intact.
   */
  private prepareLensWords(block: HTMLElement): HTMLElement[] {
    const words: HTMLElement[] = [];

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || '';
        if (!text.trim()) return;

        const fragment = document.createDocumentFragment();
        const parts = text.split(/(\s+)/);

        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
          } else {
            const span = document.createElement('span');
            span.className = 'lens-word unfocused';
            span.textContent = part;
            fragment.appendChild(span);
            words.push(span);
          }
        }
        node.parentNode?.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style') return;
        const children = Array.from(el.childNodes);
        for (const child of children) {
          processNode(child);
        }
      }
    };

    processNode(block);
    return words;
  }

  /**
   * Animate any element's words with the photographic lens rack-focus effect
   */
  private animateLensElement(element: HTMLElement): void {
    const words = this.prepareLensWords(element);
    if (words.length === 0) return;

    let idx = 0;
    const step = Math.max(1, Math.ceil(words.length / 14));

    const focusWave = () => {
      const count = Math.min(step, words.length - idx);
      for (let i = 0; i < count; i++) {
        const w = words[idx + i];
        if (w) {
          w.classList.remove('unfocused');
          w.classList.add('focused');
        }
      }
      idx += count;
      if (idx < words.length) {
        requestAnimationFrame(focusWave);
      }
    };

    requestAnimationFrame(focusWave);
  }

  private streamArticleContent(container: HTMLElement, sanitizedHtml: string): void {
    container.innerHTML = '';

    if (this.cancelCurrentStream) {
      this.cancelCurrentStream();
      this.cancelCurrentStream = null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-full';

    let isStreamActive = true;
    let observer: IntersectionObserver | null = null;
    const activeRafIds = new Set<number>();

    // Stream cancellation on unmount or navigation
    const cancelStream = () => {
      if (!isStreamActive) return;
      isStreamActive = false;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      activeRafIds.forEach(id => cancelAnimationFrame(id));
      activeRafIds.clear();
      this.cancelCurrentStream = null;
    };

    this.cancelCurrentStream = cancelStream;

    // Parse sanitized HTML into top-level blocks
    const parser = document.createElement('div');
    parser.innerHTML = sanitizedHtml;
    this.cleanArticleDom(parser);

    const blocks = Array.from(parser.children) as HTMLElement[];

    if (blocks.length === 0) {
      container.innerHTML = sanitizedHtml;
      return;
    }

    container.appendChild(wrapper);

    const streamContainer = document.createElement('div');
    streamContainer.className = 'space-y-4';
    wrapper.appendChild(streamContainer);

    const blockWordMap = new Map<HTMLElement, HTMLElement[]>();

    const focusBlockWords = (blockEl: HTMLElement, immediate = false) => {
      if (!isStreamActive) return;
      const words = blockWordMap.get(blockEl);
      if (!words || words.length === 0) return;

      if (immediate) {
        words.forEach(w => {
          w.classList.remove('unfocused');
          w.classList.add('focused');
        });
        blockWordMap.delete(blockEl);
        return;
      }

      let wordIndex = 0;
      // Stagger: adaptive words per frame (~1-2 words per frame)
      const wordsPerFrame = Math.max(1, Math.min(3, Math.ceil(words.length / 20)));

      const step = () => {
        if (!isStreamActive) return;

        const count = Math.min(wordsPerFrame, words.length - wordIndex);
        for (let i = 0; i < count; i++) {
          const w = words[wordIndex + i];
          if (w) {
            w.classList.remove('unfocused');
            w.classList.add('focused');
          }
        }
        wordIndex += count;

        if (wordIndex < words.length) {
          const id = requestAnimationFrame(step);
          activeRafIds.add(id);
        } else {
          blockWordMap.delete(blockEl);
        }
      };

      const initialId = requestAnimationFrame(step);
      activeRafIds.add(initialId);
    };

    // Viewport-Aware Focus: Triggers word-by-word unblur specifically as paragraphs enter the user's view
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          observer?.unobserve(target);

          if (target.classList.contains('lens-media')) {
            target.classList.add('focused');
          } else {
            focusBlockWords(target);
          }
        }
      });
    }, {
      root: null,
      rootMargin: '40px 0px 40px 0px', // Triggers smoothly as content approaches the screen
      threshold: 0.05
    });

    // Mount all blocks into DOM with words sitting in photographic defocus state: blur(10px) & 30% opacity
    blocks.forEach((originalBlock) => {
      const tagName = originalBlock.tagName.toLowerCase();

      // Media elements (images, figures): fade in with photographic depth-of-field transition
      if (tagName === 'img' || tagName === 'figure' || originalBlock.querySelector('img')) {
        const mediaClone = originalBlock.cloneNode(true) as HTMLElement;
        mediaClone.classList.add('lens-media');
        streamContainer.appendChild(mediaClone);
        observer?.observe(mediaClone);
        return;
      }

      // Clone block and prepare its words in lens defocus state: blur(10px) & 30% opacity
      const blockEl = originalBlock.cloneNode(true) as HTMLElement;
      blockEl.classList.add('stream-block', 'visible');

      const words = this.prepareLensWords(blockEl);
      if (words.length > 0) {
        blockWordMap.set(blockEl, words);

        // Tapping an unfocused paragraph immediately snaps all its words into focus
        blockEl.addEventListener('click', () => {
          focusBlockWords(blockEl, true);
        }, { once: true });
      }

      streamContainer.appendChild(blockEl);

      blockEl.querySelectorAll('a').forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.classList.add('underline', 'text-[#D71921]', 'hover:opacity-80');
      });

      // Observe for viewport entry so the user sees the focus rack on every paragraph as they scroll
      observer?.observe(blockEl);
    });
  }

  private renderFallbackArticle(bodyContainer: HTMLElement, article: Article): void {
    const descText = article.description || 'Full story content is hosted directly by the publisher.';
    bodyContainer.innerHTML = `
      <div class="space-y-6 stream-block visible">
        <p class="text-base sm:text-lg text-secondary leading-relaxed">${descText}</p>
        <div class="p-8 text-center border border-subtle rounded-2xl bg-card my-6">
          <div class="w-10 h-10 mx-auto mb-3 rounded-full bg-[#D71921]/15 flex items-center justify-center text-[#D71921]">
            <i data-lucide="external-link" class="w-5 h-5"></i>
          </div>
          <h3 class="font-bold text-base text-primary mb-2">Original Publisher Article</h3>
          <p class="text-secondary text-xs sm:text-sm max-w-md mx-auto mb-5">
            This story is protected from automated parsers. You can read the complete article directly at ${article.source_id}.
          </p>
          <a
            href="${article.link}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-interactive inline-flex items-center gap-2 px-6 py-3 bg-[#D71921] hover:bg-[#b5141b] text-white rounded-full font-mono text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Read at ${article.source_id} &rarr;
          </a>
        </div>
      </div>
    `;
    this.bindSpeechHandlers(`${article.title}. ${descText}`);
    if (typeof (window as any).lucide !== 'undefined') (window as any).lucide.createIcons();
  }

  private setupReaderActions(article: Article): void {
    const handleBack = () => {
      SpeechService.stop();
      store.setActiveArticle(null);
      store.setView('feed');
    };

    this.el.querySelector('#reader-back-btn')?.addEventListener('click', handleBack);
    this.el.querySelector('#reader-brand-home')?.addEventListener('click', handleBack);
    // Theme toggle button in reader top bar
    this.el.querySelector('#reader-theme-toggle-btn')?.addEventListener('click', () => {
      const current = store.getState().settings.theme;
      const nextTheme = current === 'light' ? 'dark' : 'light';
      store.updateSettings({ theme: nextTheme });
      const themeBtn = this.el.querySelector('#reader-theme-toggle-btn');
      if (themeBtn) {
        const isLight = nextTheme === 'light';
        themeBtn.setAttribute('title', isLight ? 'Switch to OLED Dark Mode' : 'Switch to Light Mode');
        themeBtn.innerHTML = `<i data-lucide="${isLight ? 'moon' : 'sun'}" class="theme-toggle-icon w-4 h-4"></i>`;
        if (typeof (window as any).lucide !== 'undefined') (window as any).lucide.createIcons();
      }
    });

    // Bookmark toggle
    const bookmarkBtn = this.el.querySelector('#reader-bookmark-btn') as HTMLButtonElement;
    bookmarkBtn?.addEventListener('click', () => {
      const saved = store.toggleBookmark(article);
      bookmarkBtn.className = `icon-action-btn p-2 rounded-full border border-subtle hover:border-strong transition-colors ${saved ? 'border-[#D71921] text-[#D71921]' : 'text-primary'}`;
      bookmarkBtn.innerHTML = `<i data-lucide="${saved ? 'bookmark-check' : 'bookmark'}" class="w-4 h-4"></i>`;
      if (typeof (window as any).lucide !== 'undefined') (window as any).lucide.createIcons();
      Toast.show(saved ? 'Article bookmarked' : 'Bookmark removed', saved ? 'success' : 'info');
    });

    // Share button
    this.el.querySelector('#reader-share-btn')?.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: article.title,
            text: article.description,
            url: article.link,
          });
        } catch {
          // cancelled
        }
      } else {
        await navigator.clipboard.writeText(article.link);
        Toast.show('Link copied to clipboard', 'success');
      }
    });
  }

  private startReaderClock(): void {
    const clockEl = this.el.querySelector('#reader-live-clock');
    if (!clockEl) return;

    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toUTCString().slice(17, 25);
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '.');
      clockEl.textContent = `${timeStr} UTC // ${dateStr}`;
    };

    updateTime();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = window.setInterval(updateTime, 1000);
  }

  private renderRecommendedStories(currentArticle: Article): void {
    const container = this.el.querySelector('#recommended-stories-grid');
    if (!container) return;

    const allArticles = store.getState().articles;
    // Exclude the currently active article
    const related = allArticles
      .filter(a => a.link !== currentArticle.link && a.title !== currentArticle.title)
      .slice(0, 6);

    if (related.length === 0) {
      const section = this.el.querySelector('#recommended-stories-section') as HTMLElement;
      if (section) section.style.display = 'none';
      return;
    }

    const currentCat = store.getState().activeCategory || 'top';

    container.innerHTML = related.map(article => {
      const fallbackUrl = getCategoryFallbackImage(currentCat, article.title || article.link);
      const displayImg = article.image_url || fallbackUrl;
      const readTime = article.reading_time_min || 3;

      return `
        <div
          class="related-article-card card-interactive group cursor-pointer rounded-xl border border-subtle bg-card hover:border-strong p-3.5 flex flex-col justify-between transition-all duration-300"
          data-link="${encodeURIComponent(article.link)}"
        >
          <div class="relative w-full h-32 rounded-lg overflow-hidden bg-zinc-900 mb-3 border border-subtle">
            <img
              src="${displayImg}"
              alt="${article.title}"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onerror="if(this.src!=='${fallbackUrl}'){this.src='${fallbackUrl}'}"
            />
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 font-brand text-[9px] uppercase text-white tracking-wider shadow-sm">
              ${article.source_id}
            </span>
          </div>

          <div class="flex-1 flex flex-col justify-between">
            <h3 class="article-headline font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-[#D71921] transition-colors mb-2 text-primary leading-snug">
              ${article.title}
            </h3>

            <div class="flex items-center justify-between text-[10px] font-mono text-muted pt-2 border-t border-subtle">
              <span>${this.formatRelativeTime(article.pubDate)}</span>
              <span>&bull;</span>
              <span>${readTime} MIN READ</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.related-article-card').forEach(card => {
      card.addEventListener('click', () => {
        const link = decodeURIComponent(card.getAttribute('data-link') || '');
        const target = related.find(a => a.link === link);
        if (target) {
          store.setActiveArticle(target);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  private bindSpeechHandlers(text: string): void {
    const playBtn = this.el.querySelector('#tts-play-btn');
    const stopBtn = this.el.querySelector('#tts-stop-btn') as HTMLButtonElement;
    const speedBtn = this.el.querySelector('#tts-speed-btn') as HTMLButtonElement;
    const label = this.el.querySelector('#tts-label');

    if (this.speechSubscription) {
      this.speechSubscription();
    }

    this.speechSubscription = SpeechService.subscribe(({ isPlaying, isPaused, rate }) => {
      if (speedBtn) speedBtn.textContent = `${rate}X`;

      if (isPlaying && !isPaused) {
        if (label) label.textContent = 'PAUSE';
        if (playBtn) playBtn.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D71921]"></i><span id="tts-label" class="tracking-wider">PAUSE</span>`;
        if (stopBtn) stopBtn.classList.remove('hidden');
      } else if (isPaused) {
        if (label) label.textContent = 'RESUME';
        if (playBtn) playBtn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i><span id="tts-label" class="tracking-wider">RESUME</span>`;
        if (stopBtn) stopBtn.classList.remove('hidden');
      } else {
        if (label) label.textContent = 'LISTEN';
        if (playBtn) playBtn.innerHTML = `<i data-lucide="volume-2" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i><span id="tts-label" class="tracking-wider">LISTEN</span>`;
        if (stopBtn) stopBtn.classList.add('hidden');
      }

      if (typeof (window as any).lucide !== 'undefined') {
        (window as any).lucide.createIcons();
      }
    });

    playBtn?.addEventListener('click', () => {
      const state = SpeechService.getState();
      if (state.isPlaying && !state.isPaused) {
        SpeechService.pause();
      } else if (state.isPaused) {
        SpeechService.resume();
      } else {
        SpeechService.speak(text, this.currentSpeechRate);
      }
    });

    stopBtn?.addEventListener('click', () => {
      SpeechService.stop();
    });

    speedBtn?.addEventListener('click', () => {
      const rates = [1.0, 1.25, 1.5, 0.75];
      const nextIdx = (rates.indexOf(this.currentSpeechRate) + 1) % rates.length;
      this.currentSpeechRate = rates[nextIdx];
      SpeechService.setRate(this.currentSpeechRate, text);
    });
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
      return `${Math.floor(diffSec / 86400)}D AGO`;
    } catch {
      return 'RECENT';
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).toUpperCase();
    } catch {
      return 'RECENT STORY';
    }
  }
}
