export class PrivacyModal {
  private el: HTMLElement;
  private backdrop: HTMLElement;
  private dialog: HTMLElement;
  private isOpen: boolean = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'privacy-modal-container';
    this.el.className = 'fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 opacity-0';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'privacy-modal-title');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'absolute inset-0 bg-black/75 backdrop-blur-sm pointer-events-none transition-opacity duration-300';

    this.dialog = document.createElement('div');
    this.dialog.className = 'fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full max-h-[85vh] bg-main border border-subtle rounded-2xl shadow-2xl flex flex-col pointer-events-none transform scale-95 transition-transform duration-300 overflow-hidden';

    this.el.appendChild(this.backdrop);
    this.el.appendChild(this.dialog);

    this.render();
    this.setupListeners();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  open(): void {
    this.isOpen = true;
    this.el.classList.remove('pointer-events-none', 'opacity-0');
    this.el.classList.add('opacity-100');
    this.backdrop.classList.remove('pointer-events-none');
    this.dialog.classList.remove('pointer-events-none', 'scale-95');
    this.dialog.classList.add('scale-100');
    document.body.style.overflow = 'hidden';

    const closeBtn = this.dialog.querySelector('#close-privacy-btn') as HTMLElement;
    closeBtn?.focus();

    if (typeof (window as any).lucide !== 'undefined') {
      (window as any).lucide.createIcons();
    }
  }

  close(): void {
    this.isOpen = false;
    this.el.classList.add('opacity-0', 'pointer-events-none');
    this.el.classList.remove('opacity-100');
    this.backdrop.classList.add('pointer-events-none');
    this.dialog.classList.add('scale-95', 'pointer-events-none');
    this.dialog.classList.remove('scale-100');
    document.body.style.overflow = '';
  }

  private render(): void {
    this.dialog.innerHTML = `
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-subtle flex items-center justify-between bg-card/60 shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-[#D71921]"></span>
          <h2 id="privacy-modal-title" class="font-brand text-base sm:text-lg font-bold tracking-wide text-primary">
            PRIVACY & COOKIE POLICY
          </h2>
        </div>
        <button
          id="close-privacy-btn"
          class="p-2 rounded-full border border-subtle hover:border-strong text-muted hover:text-primary transition-colors cursor-pointer"
          aria-label="Close Privacy Policy"
        >
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Modal Content Body -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-xs sm:text-sm font-sans leading-relaxed text-secondary">

        <!-- Banner -->
        <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-xs space-y-1">
          <div class="font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Zero-Tracker Architecture</span>
          </div>
          <p class="opacity-90">
            Sednium News operates on a strictly client-side paradigm. No third-party tracking scripts, advertising beacons, or telemetry pixels are installed.
          </p>
        </div>

        <!-- 1. Privacy Policy -->
        <section class="space-y-2">
          <h3 class="font-brand text-sm sm:text-base font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-[#D71921]"></i>
            1. Privacy Policy & Data Collection
          </h3>
          <p>
            Sednium News does not collect, sell, lease, or monetize your personal information.
          </p>
          <ul class="list-disc pl-5 space-y-1.5 text-muted font-mono text-xs">
            <li><strong>No User Accounts:</strong> You do not need to log in or provide personal identifiers (names, email addresses, or phone numbers) to read news.</li>
            <li><strong>No Tracking Pixels:</strong> We do not deploy Google Analytics, Meta Pixel, or marketing profiling tags.</li>
            <li><strong>Readability Processing:</strong> When you open a story in reader mode, article HTML is fetched to extract clean text and images for distraction-free reading. Content is rendered live and no reading history is recorded on servers.</li>
          </ul>
        </section>

        <!-- 2. Cookie Policy -->
        <section class="space-y-2">
          <h3 class="font-brand text-sm sm:text-base font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <i data-lucide="inbox" class="w-4 h-4 text-[#D71921]"></i>
            2. Cookie Policy & Local Storage
          </h3>
          <p>
            This application does not set advertising or tracking cookies. Instead, your preferences are kept directly in your browser's private <code class="px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-[11px] text-primary">localStorage</code>:
          </p>
          <div class="space-y-1.5 font-mono text-xs text-muted border border-subtle rounded-xl p-3 bg-card/40">
            <div class="flex justify-between border-b border-subtle pb-1">
              <span class="text-primary font-bold">Key</span>
              <span class="text-primary font-bold">Purpose</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_theme</span>
              <span>Theme setting (Dark, Light, OLED)</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_font</span>
              <span>Typography style (Urbanist, Serif, NDot)</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_warmth</span>
              <span>Color temperature preference</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_bookmarks</span>
              <span>Your offline saved stories</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_last_read</span>
              <span>Last read story for quick resume</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span>nothing_news_custom_feeds</span>
              <span>Your personal RSS subscriptions</span>
            </div>
          </div>
          <p class="text-[11px] text-muted">
            You can purge all stored preferences at any time through your browser's site settings or privacy clearing tools.
          </p>
        </section>

        <!-- 3. Speech Synthesis Audio -->
        <section class="space-y-2">
          <h3 class="font-brand text-sm sm:text-base font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <i data-lucide="volume-2" class="w-4 h-4 text-[#D71921]"></i>
            3. In-Browser Speech Synthesis
          </h3>
          <p>
            The built-in article reader uses your device's native browser speech engine (<code class="px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-[11px] text-primary">window.speechSynthesis</code>). Audio is synthesized locally on your CPU/device. No audio recordings, microphone streams, or voice data are collected or transferred.
          </p>
        </section>

        <!-- 4. Third-Party Publisher Outlinks -->
        <section class="space-y-2">
          <h3 class="font-brand text-sm sm:text-base font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <i data-lucide="external-link" class="w-4 h-4 text-[#D71921]"></i>
            4. External Publisher Links
          </h3>
          <p>
            Articles link to the original news organizations and publishers. When you click an external link to read at the publisher source, you enter that organization's website and are subject to their independent privacy and cookie policies.
          </p>
        </section>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-subtle bg-card/60 flex items-center justify-between shrink-0">
        <span class="text-xs font-mono text-muted">SEDNIUM NEWS // COMPLIANCE</span>
        <button
          id="confirm-privacy-btn"
          class="btn-interactive cursor-pointer px-5 py-2 rounded-full bg-[#D71921] hover:bg-[#b5141b] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors"
        >
          Got It
        </button>
      </div>
    `;
  }

  private setupListeners(): void {
    // Backdrop click
    this.backdrop.addEventListener('click', () => this.close());

    // Close buttons
    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('#close-privacy-btn') || target.closest('#confirm-privacy-btn')) {
        this.close();
      }
    });

    // Custom open event
    document.addEventListener('open-privacy-policy', () => {
      this.open();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
}
