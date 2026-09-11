export interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source_id: string;
  image_url?: string | null;
  creator?: string[] | null;
  reading_time_min?: number;
  content?: string;
  textContent?: string;
  byline?: string;
  siteName?: string;
}

export type CategoryKey =
  | 'top'
  | 'technology'
  | 'world'
  | 'business'
  | 'politics'
  | 'science'
  | 'health'
  | 'entertainment'
  | 'sports'
  | 'india';

export interface CategoryInfo {
  key: CategoryKey;
  label: string;
  icon: string;
}

export type ThemeMode = 'light' | 'dark' | 'oled';
export type FontStyle = 'ndot' | 'sans' | 'serif';
export type SortMode = 'latest' | 'variety';
export type ViewMode = 'feed' | 'reader' | 'saved';

export interface UserSettings {
  theme: ThemeMode;
  font: FontStyle;
  warmth: number; // -50 to 50
  sort: SortMode;
  excludedSources: string[];
  customFeeds: string[];
}

export interface BookmarkItem {
  id: string; // usually article link
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source_id: string;
  image_url?: string | null;
  savedAt: number;
}
