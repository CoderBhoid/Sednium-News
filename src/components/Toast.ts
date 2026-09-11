export class Toast {
  private static container: HTMLElement | null = null;

  private static getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed bottom-20 sm:bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  static show(message: string, type: 'info' | 'success' | 'alert' = 'info', duration: number = 3000): void {
    const container = this.getContainer();
    const toast = document.createElement('div');

    const accentColor = type === 'alert' ? 'border-[#D71921] text-[#D71921]' : 'border-zinc-700 text-zinc-100';

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 bg-zinc-900/95 border backdrop-blur-md rounded-lg shadow-xl font-mono text-xs uppercase tracking-wider transition-all duration-300 transform translate-y-2 opacity-0 ${accentColor}`;

    toast.innerHTML = `
      <span class="w-2 h-2 rounded-full ${type === 'alert' ? 'bg-[#D71921]' : 'bg-emerald-500'} animate-pulse"></span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}
