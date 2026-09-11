type SpeechListener = (state: { isPlaying: boolean; isPaused: boolean; rate: number }) => void;

export class SpeechService {
  private static utterance: SpeechSynthesisUtterance | null = null;
  private static isSpeaking = false;
  private static isPausedState = false;
  private static rate = 1.0;
  private static listeners: Set<SpeechListener> = new Set();

  static subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener({ isPlaying: this.isSpeaking, isPaused: this.isPausedState, rate: this.rate });
    return () => this.listeners.delete(listener);
  }

  private static notify(): void {
    const state = {
      isPlaying: this.isSpeaking,
      isPaused: this.isPausedState,
      rate: this.rate,
    };
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static speak(text: string, rate: number = 1.0): void {
    if (!this.isSupported()) return;

    this.stop();
    this.rate = rate;

    // Clean text: strip HTML, extra whitespace
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = this.rate;
    utterance.pitch = 1.0;

    // Select natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPausedState = false;
      this.notify();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPausedState = false;
      this.utterance = null;
      this.notify();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e.error);
      }
      this.isSpeaking = false;
      this.isPausedState = false;
      this.utterance = null;
      this.notify();
    };

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  static pause(): void {
    if (!this.isSupported() || !this.isSpeaking) return;
    window.speechSynthesis.pause();
    this.isPausedState = true;
    this.notify();
  }

  static resume(): void {
    if (!this.isSupported() || !this.isSpeaking) return;
    window.speechSynthesis.resume();
    this.isPausedState = false;
    this.notify();
  }

  static stop(): void {
    if (!this.isSupported()) return;
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.isPausedState = false;
    this.notify();
  }

  static setRate(newRate: number, currentText?: string): void {
    this.rate = newRate;
    if (this.isSpeaking && currentText) {
      this.speak(currentText, newRate);
    } else {
      this.notify();
    }
  }

  static getState() {
    return {
      isPlaying: this.isSpeaking,
      isPaused: this.isPausedState,
      rate: this.rate,
    };
  }
}
