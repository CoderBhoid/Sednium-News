// API_KEY removed - using local free API
const API_KEY = null;
let nextPageToken = null;
let currentArticles = []; /* Store visible articles */
let allFetchedArticles = []; /* Store all fetched articles before filtering */
let activeFilters = new Set(); /* Enabled sources */
let currentSort = 'variety'; /* 'variety' or 'latest' */
const newsContainer = document.getElementById('news-container');
const loading = document.getElementById('loading');
const input = document.getElementById('categoryInput');
// Select only category buttons, explicitly treating Settings and Saved button separately to prevent conflicts
const categoryButtons = document.querySelectorAll('.category-buttons button:not(#saved-btn)');
const themeToggle = document.getElementById('themeToggle');

let isLoading = false;
let isBookmarksView = false;

// Curated fallback images from Unsplash for each category (multiple options for variety)
const categoryImages = {
  top: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80', // newspaper
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80', // news desk
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&q=80', // headlines
    'https://images.unsplash.com/photo-1557992260-ec58e38d363c?w=800&q=80', // breaking news
  ],
  general: [
    'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80', // desk workspace
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80', // newspaper
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80', // circuit board
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80', // cybersecurity
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&q=80', // laptop code
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80', // tech abstract
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80', // matrix code
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934- voices-of-the-world?w=800&q=80', // stadium
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80', // soccer ball
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', // running
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80', // cycling
    'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800&q=80', // basketball
  ],
  business: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', // business suit
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', // meeting
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', // analytics
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', // stock market
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80', // cinema
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', // concert
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&q=80', // movie theater
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', // music stage
  ],
  science: [
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80', // laboratory
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', // research
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', // space earth
    'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&q=80', // DNA
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80', // microscope
  ],
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80', // stethoscope
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', // fitness
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&q=80', // doctor
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80', // medical
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80', // healthy food
  ],
  default: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80', // newspaper
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80', // news
    'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80', // workspace
  ]
};

/**
 * Returns a random fallback image URL for the given category.
 * Provides visual variety by selecting from multiple curated images.
 */
function getCategoryFallbackImage(category) {
  const images = categoryImages[category] || categoryImages.default;
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

/**
 * List of domains known to block iframe embedding (X-Frame-Options/CSP).
 * Articles from these sources will skip iframe fallback and show text + external link.
 */
const IFRAME_BLOCKED_DOMAINS = [
  // Major news networks
  'bbc.com', 'bbc.co.uk',
  'cnn.com',
  'nytimes.com',
  'washingtonpost.com',
  'theguardian.com',
  'reuters.com',
  'apnews.com',
  'forbes.com',
  'bloomberg.com',
  'wsj.com',
  'ft.com',
  'economist.com',
  // Tech news
  'techcrunch.com',
  'theverge.com',
  'wired.com',
  'arstechnica.com',
  'engadget.com',
  'cnet.com',
  'zdnet.com',
  // Indian news
  'timesofindia.indiatimes.com',
  'hindustantimes.com',
  'indianexpress.com',
  'ndtv.com',
  'thehindu.com',
  'news18.com',
  // Middle East / International
  'menafn.com',
  'aljazeera.com',
  'dw.com',
  'france24.com',
  // Social/aggregators
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  // Others that commonly block
  'medium.com',
  'substack.com',
  'yahoo.com',
  'msn.com',
  'foxnews.com',
  'nbcnews.com',
  'abcnews.go.com',
  'cbsnews.com',
  'usatoday.com',
  'dailymail.co.uk',
  'independent.co.uk',
  'mirror.co.uk',
  'sky.com',
];

/**
 * Checks if a URL's domain is known to block iframe embedding.
 */
function isIframeBlocked(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return IFRAME_BLOCKED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Debug: Log number of category buttons found
console.log('Category buttons found:', categoryButtons.length, Array.from(categoryButtons).map(btn => btn.getAttribute('data-category')));

function getSearchParams() {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  const category = url.searchParams.get('category');
  if (q && q !== 'null') return { mode: 'search', value: q };
  // Ensure category is valid - default to 'top' if null, undefined, or 'null' string
  const validCategory = (category && category !== 'null') ? category : 'top';
  return { mode: 'category', value: validCategory };
}

function setQueryInUrl(q) {
  const url = new URL(window.location.href);
  url.searchParams.delete('category');
  url.searchParams.set('q', q);
  window.history.pushState({}, '', url);
}

function setCategoryInUrl(category) {
  const url = new URL(window.location.href);
  url.searchParams.delete('q');
  url.searchParams.set('category', category);
  window.history.pushState({}, '', url);
}

function setActiveCategory(category) {
  // console.log('Setting active category:', category);
  categoryButtons.forEach(btn => {
    // If category is null, we just remove active from everything
    if (!category) {
      btn.classList.remove('active');
      return;
    }
    const isActive = btn.getAttribute('data-category') === category;
    btn.classList.toggle('active', isActive);
  });

  // If we are in saved mode (category null), don't set fallback
  if (!category) return;

  // Logic for fallback highlight if needed...
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`;
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return url.match(/\.(jpeg|jpg|png|gif|webp)$/i) !== null;
  } catch {
    return false;
  }
}

async function fetchNews(reset = false) {
  if (typeof isBookmarksView !== 'undefined' && isBookmarksView) {
    // Logic for saved view...
    return;
  }

  // Disable infinite scroll for search (since it's a filtering of fixed results)
  let paramsInfo = getSearchParams();
  if (paramsInfo.mode === 'search' && !reset) {
    return;
  }

  if (isLoading) return;
  isLoading = true;
  if (reset) {
    nextPageToken = null;
    currentArticles = [];
    allFetchedArticles = [];
    // Use Skeletons for initial load instead of empty
    renderSkeletons();
    // Hide spinner since skeletons are showing
    if (loading) loading.style.display = 'none';
  } else {
    // Show spinner for infinite scroll
    if (loading) loading.style.display = 'block';
  }

  const { mode, value } = getSearchParams();
  const params = new URLSearchParams();

  if (mode === 'category') {
    params.append('category', value);
  } else if (mode === 'search') {
    params.append('q', value); // Pass search query to API
    params.append('category', 'top'); // Search across top news by default (or all if API supports)
  }

  // Use local API
  const finalUrl = `/api/news?${params.toString()}`;

  // Fetch Custom Feeds Logic
  const customFeeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');
  const validCustomFeeds = customFeeds.filter(url => url && url.startsWith('http'));

  const fetchPromises = [fetch(finalUrl).then(r => r.json())];

  // If in 'top' category (default), also fetch custom feeds
  if (mode === 'category' && value === 'top' && validCustomFeeds.length > 0) {
    validCustomFeeds.forEach(feedUrl => {
      // Proxy through our API
      const proxyUrl = `/api/news?custom_url=${encodeURIComponent(feedUrl)}`;
      fetchPromises.push(fetch(proxyUrl).then(r => r.json()));
    });
  }

  try {
    const responses = await Promise.all(fetchPromises);

    // Aggregate results
    let allNewArticles = [];
    responses.forEach(data => {
      if (data.status === 'success' && data.results) {
        allNewArticles.push(...data.results);
      }
    });

    // Deduplicate by link or title
    const seen = new Set();
    allNewArticles = allNewArticles.filter(a => {
      const key = a.link || a.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort logic (Newest vs Variety)
    if (reset) {
      allFetchedArticles = allNewArticles;
    } else {
      // Append if infinite scroll (though we usually just replace for now)
      allFetchedArticles = [...allFetchedArticles, ...allNewArticles];
    }

    // Apply Sort
    if (currentSort === 'latest') {
      allFetchedArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } else {
      // Variety: Shuffle/Interleave is already somewhat done by api, but here we can just randomize slightly or keep as is
      // For now, simple sort by date is safest to avoid weird ordering, or let API's "round-robin" hold for the main feed
      // If we have mixed sources, date sort is usually best fallback
      allFetchedArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    currentArticles = allFetchedArticles; // No local filter for now aside from search which is done server-side

    if (currentArticles.length === 0) {
      if (mode === 'search') {
        const fallbackImage = getCategoryFallbackImage('default');
        newsContainer.innerHTML = `
                <div style="text-align:center; padding:2rem;">
                  <p>No results found for "<b>${value}</b>"</p>
                  <button onclick="setCategoryInUrl('top'); fetchNews(true);" style="margin-top:1rem; padding:0.5rem 1rem; background:var(--accent-color); color:white; border:none; border-radius:8px; cursor:pointer;">Return to Top News</button>
                </div>
            `;
      } else {
        newsContainer.innerHTML = '<p class="error">No news available in this category currently.</p>';
      }
    } else {
      renderArticles(currentArticles);
    }

    if (reset) {
      newsContainer.scrollTop = 0;
    }

    // Save logic
    if (mode === 'category' && value !== 'top') {
      // Don't mix custom feeds logic for other categories
    }

  } catch (error) {
    console.error('Error fetching news:', error);
    if (reset) newsContainer.innerHTML = '<p class="error">Failed to load news. Check your connection.</p>';
  } finally {
    isLoading = false;
    loading.style.display = 'none';
  }
}

// Custom Feeds Management
function loadCustomFeeds() {
  const list = document.getElementById('custom-rss-list');
  if (!list) return;
  const feeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');
  list.innerHTML = '';

  if (feeds.length === 0) {
    list.innerHTML = '<div style="text-align:center; opacity:0.6; padding:0.5rem;">No custom feeds yet</div>';
    return;
  }

  feeds.forEach((url, index) => {
    const div = document.createElement('div');
    div.className = 'custom-rss-item';
    // Removed inline style; handled by CSS class now
    div.innerHTML = `
            <span title="${url}">${url}</span>
            <button class="remove-feed-btn" data-index="${index}">&times;</button>
        `;
    div.querySelector('.remove-feed-btn').onclick = () => removeCustomFeed(index);
    list.appendChild(div);
  });
}

function addCustomFeed(url) {
  if (!url || !url.startsWith('http')) {
    alert('Please enter a valid URL (starting with http/https)');
    return;
  }
  const feeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');
  if (feeds.includes(url)) {
    alert('Feed already exists!');
    return;
  }
  feeds.push(url);
  localStorage.setItem('customFeeds', JSON.stringify(feeds));
  document.getElementById('custom-rss-input').value = '';
  loadCustomFeeds();
  alert('Feed added! Return to Home to see updates.');
}

function removeCustomFeed(index) {
  const feeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');
  feeds.splice(index, 1);
  localStorage.setItem('customFeeds', JSON.stringify(feeds));
  loadCustomFeeds();
}

/**
 * Extract unique sources and populate filter menu
 */
function generateSourceFilters(articles) {
  const sources = new Set(articles.map(a => a.source_id || 'Unknown'));
  const list = document.getElementById('settings-source-list');
  if (!list) return;

  list.innerHTML = '';

  // Sort sources alphabetically
  Array.from(sources).sort().forEach(source => {
    const div = document.createElement('div');
    div.className = 'source-item';
    // By default check all if activeFilters is empty, else check if in set
    const isChecked = activeFilters.size === 0 || activeFilters.has(source);

    div.innerHTML = `
            <input type="checkbox" value="${source}" ${isChecked ? 'checked' : ''}>
            <span>${source}</span>
        `;

    // Handle click on the row (not just checkbox)
    div.addEventListener('click', (e) => {
      const checkbox = div.querySelector('input');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      // Update logic
      if (checkbox.checked) {
        activeFilters.add(source);
      } else {
        activeFilters.delete(source);
      }

      // If all unchecked, activeFilters is empty == show all? 
      // Logic in applyFiltersAndSort: if size > 0, filter.
      // If I uncheck all, size is 0 -> Shows all. That's actually intuitive (selecting none means no filter).
      // But if I want to "Exclude" everything, I see nothing.
      // Best UX: "Uncheck to hide" implies if I uncheck one, it hides. If I uncheck ALL, I see nothing?
      // Or "Check to show".
      // If start with all checked (implicit).
      // Let's populate activeFilters with ALL sources initially if empty.
      if (activeFilters.size === 0 && isChecked) {
        // First interaction: Populate with all except the one unchecked?
        // This is complex. 
        // Simple logic:
        // activeFilters stores ALLOWED sources.
        // If activeFilters is empty, we assume ALL allowed.
        // So if I uncheck valid source, I need to add ALL OTHERS to activeFilters first.
      }

      // BETTER LOGIC:
      // On load, `activeFilters` is empty (Show All).
      // When generating list, if empty, we check all boxes.

      // When USER clicks:
      // 1. Gather ALL checked boxes.
      // 2. Update `activeFilters`.
      // 3. Call `apply`.

      updateFiltersFromUI();
    });

    list.appendChild(div);
  });
}

function updateFiltersFromUI() {
  const checkboxes = document.querySelectorAll('#settings-source-list input');
  activeFilters.clear();
  let checkedCount = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      activeFilters.add(cb.value);
      checkedCount++;
    }
  });

  // If all are checked, we can clear set to optimize (optional, but consistent with empty=all)
  if (checkedCount === checkboxes.length) {
    activeFilters.clear();
  }

  applyFiltersAndSort();
}

/**
 * Filter and Sort articles then render
 */
function applyFiltersAndSort() {
  let filtered = [...allFetchedArticles];

  // Filter by Source
  if (activeFilters.size > 0) {
    filtered = filtered.filter(a => activeFilters.has(a.source_id || 'Unknown'));
  }

  // Sort
  if (currentSort === 'latest') {
    filtered.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  } else {
    // 'variety' - Maintain API order (which is variety interleaved)
    // No action needed as allFetchedArticles is already interleaved
  }

  renderArticles(filtered);
}

/**
 * Render list of articles to the container
 */
function renderArticles(articles) {
  const { mode, value } = getSearchParams();
  newsContainer.innerHTML = '';
  currentArticles = articles; // Update visible list

  if (articles.length === 0) {
    newsContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">No articles match your filters.</p>';
    return;
  }

  articles.forEach((article, index) => {
    let imageSrc = article.image_url;
    if (!isValidImageUrl(imageSrc)) {
      // Use random category-specific fallback image for variety
      imageSrc = getCategoryFallbackImage(mode === 'category' ? value : 'default');
    }

    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.cursor = 'pointer';
    card.innerHTML = `
            <img src="${imageSrc}" alt="${article.title}" loading="lazy">
            <h2>${article.title}</h2>
            <small>By ${article.source_id || 'Unknown Source'}</small>
            <p>${article.description || 'No description available.'}</p>
            <small>${formatDate(article.pubDate)}</small>
          `;

    card.addEventListener('click', () => {
      openReadView(index);
    });
    newsContainer.appendChild(card);
  });
}

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = input.value.trim();
    if (val) {
      setQueryInUrl(val);
      setActiveCategory(null);
      fetchNews(true);
    }
  }
});

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.getAttribute('data-category');
    setCategoryInUrl(cat);
    input.value = '';
    setActiveCategory(cat);
    fetchNews(true);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('Sednium News Script v1.6.3-style-fix Loaded');
  console.log('DOM loaded, setting initial state');
  /* ========== SETTINGS LOGIC ========== */

  // Elements
  const settingsBtn = document.getElementById('settings-trigger');
  // const settingsModal = document.getElementById('settings-modal'); // Removed in v1.7
  const closeSettingsBtn = document.getElementById('close-settings');
  const themeButtons = document.querySelectorAll('.theme-group button');
  const fontButtons = document.querySelectorAll('.font-group button');
  const headerLogo = document.querySelector('.header-logo');

  // Helper to update logo based on theme
  function updateLogo(isDark) {
    if (headerLogo) {
      headerLogo.src = isDark ? 'assets/logo.png' : 'assets/logolight.png';
    }
  }

  // --- Theme Handling ---
  function applyTheme(theme) {
    // Remove existing active states
    themeButtons.forEach(btn => btn.classList.remove('active'));
    // Activate correct button
    const activeBtn = document.querySelector(`.theme-group button[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Apply classes
    const isDark = theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Update logo and storage
    try {
      updateLogo(isDark);
    } catch (e) { console.error('Logo update failed', e); }
    localStorage.setItem('theme', theme);
  }

  // Init Theme
  const storedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme ? storedTheme : (systemDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  // Theme Click Listeners
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.getAttribute('data-theme'));
    });
  });

  // --- Font Handling ---
  function applyFont(font) {
    // Remove active states
    fontButtons.forEach(btn => btn.classList.remove('active'));
    // Activate button
    const activeBtn = document.querySelector(`.font-group button[data-font="${font}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Clear existing font classes
    document.body.classList.remove('font-ndot', 'font-inter', 'font-serif');
    // Add new class if not default (ndot is default in CSS but explicit class helps)
    document.body.classList.add(`font-${font}`);

    localStorage.setItem('font', font);
  }

  // Init Font
  const storedFont = localStorage.getItem('font') || 'ndot';
  applyFont(storedFont);

  // Font Click Listeners
  fontButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyFont(btn.getAttribute('data-font'));
    });
  });

  // --- Warmth Slider Handling ---
  const warmthSlider = document.getElementById('warmthSlider');
  const warmthOverlay = document.getElementById('warmth-overlay');

  function updateWarmth(value, save = true) {
    const val = parseInt(value);
    let color = 'transparent';

    if (val > 0) {
      // Warm (Orange/Yellow) - Max opacity 0.3 at value 50
      const opacity = (val / 50) * 0.3;
      color = `rgba(255, 160, 0, ${opacity})`;
    } else if (val < 0) {
      // Cold (Blue) - Max opacity 0.3 at value -50
      const opacity = (Math.abs(val) / 50) * 0.2;
      color = `rgba(0, 100, 255, ${opacity})`;
    }

    if (warmthOverlay) {
      warmthOverlay.style.setProperty('--warmth-color', color);
    }

    if (save) {
      localStorage.setItem('warmth', val);
    }
  }

  if (warmthSlider) {
    const storedWarmth = localStorage.getItem('warmth') || 0;
    warmthSlider.value = storedWarmth;
    updateWarmth(storedWarmth);

    // Update Visuals on Drag (Fast)
    warmthSlider.addEventListener('input', (e) => {
      // Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => {
        updateWarmth(e.target.value, false); // false = don't save yet
      });
    });

    // Save to Storage on Release (Prevents Lag)
    warmthSlider.addEventListener('change', (e) => {
      updateWarmth(e.target.value, true); // true = save now
    });
  }

  // --- Settings View Handling ---
  const settingsView = document.getElementById('settings-view');

  function openSettings() {
    if (settingsView) {
      console.log('Opening Settings View');
      if (typeof loadCustomFeeds === 'function') loadCustomFeeds(); // Refresh list
      settingsView.classList.remove('hidden');
      // Small timeout to allow display:block to apply before adding transform class
      requestAnimationFrame(() => {
        settingsView.classList.add('visible');
      });
      document.body.classList.add('modal-open'); // Prevent body scroll
    }
  }

  function closeSettings() {
    if (settingsView) {
      console.log('Closing Settings View');
      settingsView.classList.remove('visible');
      // Wait for transition to finish before hiding
      setTimeout(() => {
        if (!settingsView.classList.contains('visible')) {
          settingsView.classList.add('hidden');
        }
      }, 300);
      document.body.classList.remove('modal-open');

      // Reset bottom nav active state
      if (typeof updateBottomNav === 'function') {
        if (isBookmarksView) {
          updateBottomNav('nav-saved');
        } else {
          updateBottomNav('nav-home');
        }
      }
    }
  }

  if (settingsBtn) {
    settingsBtn.onclick = function (e) {
      e.preventDefault();
      openSettings();
    };
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.onclick = function (e) {
      e.preventDefault();
      closeSettings();
    };
  }

  // Note: No outside click close for full page view "Back" button is preferred.

  // --- Saved Tab Logic ---
  const savedBtn = document.getElementById('saved-btn');

  function loadSavedArticles() {
    isBookmarksView = true; // SET FLAG

    // Use try-catch for safety
    let saved = [];
    try {
      saved = getBookmarks(); // Use the shared helper function with correct key
    } catch (e) {
      console.error('Error parsing saved articles', e);
      saved = [];
    }

    // Clear any existing articles first
    newsContainer.innerHTML = '';

    if (!saved || saved.length === 0) {
      newsContainer.innerHTML = '<div style="text-align:center; padding:3rem;"><p>No saved articles yet.</p><small>Bookmarked articles will appear here.</small></div>';
      currentArticles = [];
    } else {
      renderArticles(saved.reverse());
    }

    // Update active state
    if (categoryButtons) {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
    }
    if (savedBtn) savedBtn.classList.add('active');

    // Remove sorting/filtering for Saved view as it's a custom list
    activeFilters.clear();
  }

  if (savedBtn) {
    savedBtn.addEventListener('click', (e) => {
      console.log('Saved button clicked');
      e.preventDefault();

      // Update UI state
      if (categoryButtons) {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
      }
      savedBtn.classList.add('active');

      // Update Bottom Nav if visible
      if (typeof updateBottomNav === 'function') {
        updateBottomNav('nav-saved');
      }

      setActiveCategory(null);
      loadSavedArticles();
    });
  }
  // --- Android Back Button Handling ---
  if (window.Capacitor) {
    const App = window.Capacitor.Plugins.App;

    App.addListener('backButton', ({ canGoBack }) => {
      // Priority 1: Close Settings Modal
      if (settingsModal && settingsModal.classList.contains('visible')) {
        closeSettings();
        return;
      }

      // Priority 2: Close Read View
      if (readView && !readView.classList.contains('hidden')) {
        closeReadView();
        return;
      }

      // Priority 3: Apps usually minimize or exit
      App.exitApp();
    });
  }

  // --- Feed Tools (Sort/Filter in Settings) ---

  // Sort Buttons Logic
  const sortButtons = document.querySelectorAll('.sort-group button');

  function applySortUI(sortMode) {
    sortButtons.forEach(btn => btn.classList.remove('active'));
    const active = document.querySelector(`.sort-group button[data-sort="${sortMode}"]`);
    if (active) active.classList.add('active');
  }

  // Init Sort UI
  applySortUI(currentSort);

  sortButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentSort = btn.getAttribute('data-sort');
      applySortUI(currentSort);
      applyFiltersAndSort();
    });
  });

  // Close modals on outside click
  // Close modals on outside click matches the new view ID
  document.addEventListener('click', (e) => {
    // If settings view is open... actually for full page view we usually don't close on "outside" click since it covers everything.
    // The previous logic was for a modal. For a full page view (z-index 2000), there is no 'outside'.
    // But if we want to keep it safe:
    /* 
    if (settingsView && settingsView.classList.contains('visible') && !settingsView.contains(e.target) && !e.target.closest('#settings-trigger')) {
       closeSettings();
    }
    */
    // Since it's full screen, we rely on the BACK button. Removing the buggy modal logic.
  });

  const { mode, value } = getSearchParams();
  const urlParams = new URLSearchParams(window.location.search);
  const readUrl = urlParams.get('read');

  if (readUrl) {
    // Deep link to reader mode
    console.log('Deep link detected:', readUrl);
    renderReadView({
      link: readUrl,
      title: 'Loading Article...',
      source_id: 'External Link'
    });
  }

  // --- RSS Feeds Population ---
  function populateRssList() {
    const container = document.getElementById('settings-rss-list');
    if (!container) return;

    const baseUrl = window.location.origin;
    const categories = ['Top', 'Technology', 'Sports', 'Business', 'Entertainment', 'Science', 'Health'];

    container.innerHTML = '';

    categories.forEach(cat => {
      const catSlug = cat.toLowerCase();
      const rssUrl = `${baseUrl}/api/rss?category=${catSlug}`;

      const div = document.createElement('div');
      div.className = 'rss-item';
      div.innerHTML = `
            <span>${cat}</span>
            <button class="rss-copy-btn" data-url="${rssUrl}">Copy Link</button>
          `;

      div.querySelector('button').addEventListener('click', function (e) {
        const url = this.getAttribute('data-url');
        navigator.clipboard.writeText(url).then(() => {
          const originalTextInput = this.textContent;
          this.textContent = 'Copied!';
          this.style.borderColor = 'green';
          this.style.color = 'green';
          setTimeout(() => {
            this.textContent = originalTextInput;
            this.style.borderColor = '';
            this.style.color = '';
          }, 2000);
        }).catch(err => {
          console.error('Copy failed', err);
          alert('Copy failed: ' + url);
        });
      });

      container.appendChild(div);
    });
  }

  // Call it on load
  populateRssList();

  console.log('Initial mode:', mode, 'value:', value);
  if (mode === 'category') {
    setActiveCategory(value); // Ensure "Headlines" (top) is active by default
  } else if (mode === 'search') {
    input.value = value;
    setActiveCategory(null);
  }
  // ========== BOTTOM NAVIGATION (Refactored) ==========
  const navHome = document.getElementById('nav-home');
  const navSaved = document.getElementById('nav-saved');
  const navSettings = document.getElementById('nav-settings');
  const bottomNavItems = document.querySelectorAll('.nav-item');

  function updateBottomNav(activeId) {
    bottomNavItems.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Hook into internal functions directly since we are now in scope
  if (navHome) {
    navHome.addEventListener('click', () => {
      updateBottomNav('nav-home');
      setCategoryInUrl('top');
      setActiveCategory('top');
      isBookmarksView = false; // RESET FLAG
      fetchNews(true);
    });
  }

  if (navSaved) {
    navSaved.addEventListener('click', () => {
      updateBottomNav('nav-saved');
      loadSavedArticles(); // Now this works!
    });
  }

  if (navSettings) {
    navSettings.addEventListener('click', () => {
      updateBottomNav('nav-settings');
      openSettings();
    });
  }

  // Main saved listener handles everything now.

  // When settings close, revert nav if needed?
  // Let's keep it simple for now.

  fetchNews(true);
});

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    fetchNews();
  }
});

/* Read View Logic */
const readView = document.getElementById('read-view');
const backBtn = document.getElementById('back-btn');
const readTitle = document.getElementById('read-title');
const readImg = document.getElementById('read-img');
const readDate = document.getElementById('read-date');
const readSource = document.getElementById('read-source');
const readContent = document.getElementById('read-content');
const readOriginalLink = document.getElementById('read-original-link');
const relatedContainer = document.getElementById('related-container');
const listenBtn = document.getElementById('listen-btn');

let ttsSpeaking = false;
let currentUtterance = null;

let ttsChunks = [];
let ttsChunkIndex = 0;

function stopTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    ttsSpeaking = false;
    ttsChunks = [];
    ttsChunkIndex = 0;
    updateListenButtonState();
  }
}

function updateListenButtonState() {
  if (!listenBtn) return;
  const icon = listenBtn.querySelector('svg');
  if (ttsSpeaking) {
    listenBtn.classList.add('active');
    // Stop Icon
    icon.innerHTML = '<rect x="4" y="4" width="16" height="16"></rect>';
  } else {
    listenBtn.classList.remove('active');
    // Headphones Icon
    icon.innerHTML = '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>';
  }
}

function speakNextChunk() {
  if (ttsChunkIndex >= ttsChunks.length) {
    ttsSpeaking = false;
    updateListenButtonState();
    return;
  }

  const text = ttsChunks[ttsChunkIndex];
  // Skip empty or super short chunks
  if (!text || text.trim().length < 2) {
    ttsChunkIndex++;
    speakNextChunk();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;

  utterance.onend = () => {
    ttsChunkIndex++;
    speakNextChunk();
  };

  utterance.onerror = (e) => {
    console.error('TTS Error (Chunk ' + ttsChunkIndex + '):', e);
    // Try to continue
    ttsChunkIndex++;
    speakNextChunk();
  };

  window.speechSynthesis.speak(utterance);
}

function toggleTTS() {
  if (!window.speechSynthesis) {
    alert("Text-to-Speech not supported on this device.");
    return;
  }

  if (ttsSpeaking) {
    stopTTS();
    return;
  }

  // Start Speaking
  if (!readContent) return;
  const text = readContent.innerText;

  if (!text || text.length < 10) {
    alert("No readable content found for this article.");
    return;
  }

  // Chunking Logic: Split by sentence endings (. ! ?), keeping the punctuation
  // Logic: Match any character that is not .?!, followed by .?!
  ttsChunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  ttsChunkIndex = 0;
  ttsSpeaking = true;
  updateListenButtonState();

  // Cancel any existing speech first
  window.speechSynthesis.cancel();

  // Small delay to allow cancel to take effect
  setTimeout(() => {
    speakNextChunk();
  }, 50);
}

if (listenBtn) {
  listenBtn.addEventListener('click', toggleTTS);
}

// We now use the server-side /api/read endpoint.

/**
 * Populates the related articles sidebar with other articles.
 */
function populateRelatedArticles(currentIndex) {
  relatedContainer.innerHTML = '';

  // Get articles excluding the current one
  const relatedArticles = currentArticles.filter((_, i) => i !== currentIndex).slice(0, 10);

  relatedArticles.forEach((article, i) => {
    // Find the actual index in currentArticles
    const actualIndex = currentArticles.findIndex(a => a === article);

    // Get image or hide it
    let imgHtml = '';
    if (isValidImageUrl(article.image_url)) {
      imgHtml = `<img src="${article.image_url}" alt="" onerror="this.style.display='none'">`;
    } else {
      // Use random category fallback for variety
      const { mode, value } = getSearchParams();
      const fallbackImg = getCategoryFallbackImage(mode === 'category' ? value : 'default');
      imgHtml = `<img src="${fallbackImg}" alt="">`;
    }

    const card = document.createElement('div');
    card.className = 'related-card';
    card.innerHTML = `
      ${imgHtml}
      <div class="related-card-info">
        <p class="related-card-title">${article.title}</p>
        <span class="related-card-source">${article.source_id || 'Unknown'}</span>
      </div>
    `;
    card.addEventListener('click', () => openReadView(actualIndex));
    relatedContainer.appendChild(card);
    card.addEventListener('click', () => openReadView(actualIndex));
    relatedContainer.appendChild(card);
  });
}

// Toggle Related Logic
const toggleRelatedBtn = document.getElementById('toggle-related');
if (toggleRelatedBtn) {
  toggleRelatedBtn.addEventListener('click', () => {
    const relatedSection = document.querySelector('.related-articles');
    relatedSection.classList.toggle('collapsed');
    toggleRelatedBtn.textContent = relatedSection.classList.contains('collapsed') ? 'Show' : 'Hide';
  });
}

async function openReadView(index) {
  console.log('openReadView called for index:', index);
  if (index === null || index < 0 || !currentArticles || !currentArticles[index]) {
    console.error('Invalid article index or empty list:', index);
    return;
  }

  currentArticleIndex = index; // Update index immediately
  const article = currentArticles[index];

  // Render content
  renderReadView({
    title: article.title,
    link: article.link,
    image_url: article.image_url,
    source_id: article.source_id,
    creator: article.creator,
    pubDate: article.pubDate,
    description: article.description
  });

  // *** CRITICAL FIX: Update Bookmark Button State ***
  const bookmarks = getBookmarks(); // Use shared helper
  const isBookmarked = bookmarks.some(b => b.link === article.link);
  // Log bookmark state
  console.log('Article is bookmarked:', isBookmarked);
  updateBookmarkButton(isBookmarked);

  // *** Share Button Logic ***
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    // Clone to remove old listeners if any
    const newShareBtn = shareBtn.cloneNode(true);
    shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);

    newShareBtn.addEventListener('click', async () => {
      const deepLink = `${window.location.origin}/?read=${encodeURIComponent(article.link)}`;
      const shareData = {
        title: article.title,
        text: `Check out this article on Sednium News: ${article.title}`,
        url: deepLink
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(deepLink);
          alert('Link copied to clipboard!');
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    });
  }
}

/**
 * versatile function to render read view from an object
 * Used by both the main list click and external deep links
 */
async function renderReadView(articleData) {
  // Show view immediately with loading state
  readTitle.textContent = articleData.title || 'Loading...';
  readContent.innerHTML = '<div class="spinner"></div><p style="text-align:center">Loading full article...</p>';
  readOriginalLink.href = articleData.link;

  // Image handling
  const imageSrc = articleData.image_url;
  if (isValidImageUrl(imageSrc)) {
    readImg.src = imageSrc;
    readImg.style.display = 'block';
  } else {
    readImg.style.display = 'none';
  }

  // Set source, author, and date
  readSource.textContent = articleData.source_id || 'Sednium News';

  // Author handling
  const readAuthor = document.getElementById('read-author');
  const metaSeparator = document.querySelector('.meta-separator');
  const creator = articleData.creator ? (Array.isArray(articleData.creator) ? articleData.creator.join(', ') : articleData.creator) : null;

  if (creator) {
    readAuthor.textContent = creator;
    readAuthor.style.display = '';
    if (metaSeparator) metaSeparator.style.display = '';
  } else {
    readAuthor.style.display = 'none';
    if (metaSeparator) metaSeparator.style.display = 'none';
  }

  readDate.textContent = articleData.pubDate ? formatDate(articleData.pubDate) : '';

  // For deep links, we might not have related articles immediately available from currentArticles
  if (currentArticles.length > 0) {
    populateRelatedArticles(currentArticleIndex || 0);
  }

  readView.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.querySelector('.read-view-main').scrollTop = 0;

  try {
    // Call our Proxy API to get raw HTML, then scrape client-side
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(articleData.link)}`);
    if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
    const html = await response.text();

    // Parse HTML string in browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Fix relative links in the parsed doc before extraction
    const base = document.createElement('base');
    base.href = new URL(articleData.link).origin;
    doc.head.appendChild(base);

    // Use Readability
    // Ensure Readability is loaded
    if (typeof Readability === 'undefined') {
      throw new Error('Readability library not loaded');
    }

    const reader = new Readability(doc);
    const article = reader.parse();

    if (article && article.content) {
      // If we didn't have title/image before, update them now if available
      if ((!articleData.title || articleData.title === 'Loading...') && article.title) {
        readTitle.textContent = article.title;
      }

      readContent.innerHTML = article.content;

      // --- Duplicate Image Fix ---
      // Identify and hide the first image in content if it matches the header image
      if (readImg.style.display !== 'none' && readImg.src) {
        const contentImages = readContent.getElementsByTagName('img');
        if (contentImages.length > 0) {
          const firstImg = contentImages[0];
          const headerUrl = readImg.src.split('?')[0];
          const contentUrl = firstImg.src.split('?')[0];
          const headerFile = headerUrl.split('/').pop();
          const contentFile = contentUrl.split('/').pop();

          if (headerUrl === contentUrl || (headerFile && contentFile && headerFile === contentFile)) {
            firstImg.style.display = 'none';
            const parent = firstImg.parentElement;
            if (parent && (parent.tagName === 'FIGURE' || (parent.tagName === 'P' && parent.innerText.trim().length < 5))) {
              parent.style.display = 'none';
            }
            console.log('Removed duplicate hero image from content');
          }
        }
      }
    } else {
      throw new Error('Content extraction failed');
    }
  } catch (err) {
    console.error('Reader API error:', err);
    // Fallback
    readContent.innerHTML = `
      <p>${articleData.description || 'Summary not available.'}</p>
      <br>
      <p class="read-original">Unable to load full content. <a href="${articleData.link}" target="_blank">Read original article</a></p>
    `;
  }
}

function closeReadView() {
  readView.classList.add('hidden');
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open'); // Ensure global scroll lock is off

  // Stop TTS if playing
  stopTTS();
}

backBtn.addEventListener('click', closeReadView);

/* ========== NEW FEATURES ========== */

// Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  // Show/hide back to top button
  if (window.scrollY > 500) {
    backToTopBtn.classList.remove('hidden');
  } else {
    backToTopBtn.classList.add('hidden');
  }

  // Infinite scroll for loading more news
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    fetchNews();
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Bookmarks (localStorage)
const BOOKMARKS_KEY = 'sednium_bookmarks';

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function isBookmarked(articleLink) {
  return getBookmarks().some(b => b.link === articleLink);
}

function toggleBookmark(article) {
  console.log('toggleBookmark called for:', article.title);
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.link === article.link);

  if (index > -1) {
    // Remove bookmark
    bookmarks.splice(index, 1);
    updateBookmarkButton(false);
    console.log('Bookmark removed');
  } else {
    // Add bookmark
    bookmarks.push({
      title: article.title,
      link: article.link,
      source: article.source_id,
      image: article.image_url || null, // Ensure image is stored even if null
      date: article.pubDate,
      savedAt: new Date().toISOString()
    });
    updateBookmarkButton(true);
    console.log('Bookmark added');
  }

  saveBookmarks(bookmarks);

  // If we are in Saved view, realtime update?
  // Maybe dangerous to remove card immediately while reading.
  // We'll leave it until refresh.
}

function updateBookmarkButton(isActive) {
  const bookmarkBtn = document.getElementById('bookmark-btn');
  if (isActive) {
    bookmarkBtn.classList.add('bookmarked');
    bookmarkBtn.title = 'Remove Bookmark';
  } else {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.title = 'Bookmark';
  }
}

/**
 * Render Skeleton Loading Cards
 */
function renderSkeletons(count = 5) {
  const newsContainer = document.getElementById('news-container');
  if (!newsContainer) return;

  newsContainer.innerHTML = ''; // Clear container

  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-text title"></div>
      <div class="skeleton-text short"></div>
      <div class="skeleton-text"></div>
    `;
    newsContainer.appendChild(card);
  }
}

// Share functionality
function shareArticle(article) {
  const shareData = {
    title: article.title,
    text: `Check out this article: ${article.title}`,
    url: article.link
  };

  if (navigator.share) {
    navigator.share(shareData).catch(err => {
      console.log('Share cancelled or failed:', err);
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(article.link).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      prompt('Copy this link:', article.link);
    });
  }
}

// Event listeners for share and bookmark
let currentArticleIndex = null;

document.getElementById('bookmark-btn').addEventListener('click', () => {
  if (currentArticleIndex !== null && currentArticles[currentArticleIndex]) {
    toggleBookmark(currentArticles[currentArticleIndex]);
  }
});

document.getElementById('share-btn').addEventListener('click', () => {
  if (currentArticleIndex !== null && currentArticles[currentArticleIndex]) {
    shareArticle(currentArticles[currentArticleIndex]);
  }
});

// Swipe Navigation in Read View
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 100;

readView.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

readView.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) < SWIPE_THRESHOLD) return;

  if (diff > 0) {
    // Swipe left - next article
    navigateArticle(1);
  } else {
    // Swipe right - previous article
    navigateArticle(-1);
  }
}

function navigateArticle(direction) {
  if (currentArticleIndex === null) return;

  const newIndex = currentArticleIndex + direction;
  if (newIndex >= 0 && newIndex < currentArticles.length) {
    // Animate out
    const contentContainer = document.querySelector('.read-view-content');
    const exitClass = direction > 0 ? 'slide-out-left' : 'slide-out-right';
    const enterClass = direction > 0 ? 'slide-in-right' : 'slide-in-left';

    contentContainer.classList.add(exitClass);

    // Wait for animation to finish before switching content
    setTimeout(() => {
      contentContainer.classList.remove(exitClass);
      openReadView(newIndex).then(() => {
        // Animate in new content
        const newContainer = document.querySelector('.read-view-content');
        newContainer.classList.add(enterClass);
        setTimeout(() => newContainer.classList.remove(enterClass), 300);
      });
    }, 250);
  }
}

// Update openReadView logic merged into main function above

// Pull to refresh (mobile)
let pullStartY = 0;
let isPulling = false;

document.body.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    pullStartY = e.touches[0].clientY;
    isPulling = true;
  }
}, { passive: true });

document.body.addEventListener('touchmove', (e) => {
  if (!isPulling) return;
  const pullDistance = e.touches[0].clientY - pullStartY;
  if (pullDistance > 100 && window.scrollY === 0) {
    loading.style.display = 'block';
  }
}, { passive: true });

document.body.addEventListener('touchend', (e) => {
  if (!isPulling) return;
  const pullDistance = e.changedTouches[0].clientY - pullStartY;
  if (pullDistance > 100 && window.scrollY === 0) {
    // Trigger refresh
    const { mode, value } = getSearchParams();
    fetchNews(true);
  }
  isPulling = false;
}, { passive: true });

// End of script logic
