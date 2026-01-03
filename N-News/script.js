const API_KEY = 'pub_26dbb5b22f5c46fa9730e78775239e27';
let nextPageToken = null;
let currentArticles = []; /* Store articles for read view */
const newsContainer = document.getElementById('news-container');
const loading = document.getElementById('loading');
const input = document.getElementById('categoryInput');
const categoryButtons = document.querySelectorAll('nav button');
const themeToggle = document.getElementById('themeToggle');

let isLoading = false;

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
  console.log('Setting active category:', category);
  let found = false;
  categoryButtons.forEach(btn => {
    const isActive = btn.getAttribute('data-category') === category;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      console.log('Activated button:', btn.textContent, btn.getAttribute('data-category'));
      found = true;
    }
  });
  if (!found && category) {
    console.warn(`No button found for category: ${category}`);
    const fallbackButton = document.querySelector('button[data-category="top"]');
    if (fallbackButton) {
      fallbackButton.classList.add('active');
      console.log('Fallback: Activated Headlines button');
    }
  }
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
  if (isLoading) return;
  isLoading = true;
  if (!reset) {
    loading.style.display = 'block';
  }

  if (reset) {
    nextPageToken = null;
    newsContainer.innerHTML = '';
    currentArticles = []; /* Reset articles list */
  }

  const { mode, value } = getSearchParams();
  let params = new URLSearchParams();
  params.append('apikey', API_KEY);
  params.append('language', 'en');
  params.append('size', '10');

  if (mode === 'search') {
    params.append('q', encodeURIComponent(value));
  } else if (mode === 'category') {
    params.append('category', value);
  }

  if (nextPageToken) {
    params.append('page', nextPageToken);
  }

  const url = `https://newsdata.io/api/1/news?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    const data = await res.json();

    if (data.status === 'success') {
      if (data.results && data.results.length > 0) {
        for (const article of data.results) {
          // Skip duplicate articles (same title already in feed)
          const titleLower = (article.title || '').toLowerCase().trim();
          const isDuplicate = currentArticles.some(
            existing => (existing.title || '').toLowerCase().trim() === titleLower
          );
          if (isDuplicate) {
            console.log('Skipping duplicate article:', article.title);
            continue;
          }

          let imageSrc = article.image_url;
          if (!isValidImageUrl(imageSrc)) {
            console.log('Using fallback image for:', article.title, 'image_url:', imageSrc);
            // Use random category-specific fallback image for variety
            imageSrc = getCategoryFallbackImage(mode === 'category' ? value : 'default');
          }

          currentArticles.push(article);
          const articleIndex = currentArticles.length - 1;

          const card = document.createElement('div');
          card.className = 'card';
          card.style.cursor = 'pointer'; // Make card appear clickable
          card.innerHTML = `
            <img src="${imageSrc}" alt="${article.title}" loading="lazy">
            <h2>${article.title}</h2>
            <small>By ${article.source_id || 'Unknown Source'}</small>
            <p>${article.description || 'No description available.'}</p>
            <small>${formatDate(article.pubDate)}</small>
          `;
          // Click on card to open read view
          card.addEventListener('click', () => openReadView(articleIndex));
          newsContainer.appendChild(card);
          requestAnimationFrame(() => {
            card.classList.add('fade-in');
          });
        }
      } else {
        const fallbackImage = getCategoryFallbackImage(mode === 'category' ? value : 'default');
        newsContainer.innerHTML = `
          <p>No news found for <b>${value}</b>.</p>
          <img src="${fallbackImage}" alt="No news available" style="max-width: 100%;">
        `;
      }
      nextPageToken = data.nextPage || null;
    } else {
      console.error('API error:', data);
      if (reset) newsContainer.innerHTML = `<p>Error: ${data.message || 'Failed to fetch news'}</p>`;
    }
  } catch (err) {
    console.error('Fetch error:', err);
    if (reset) newsContainer.innerHTML = `<p>Error: ${err.message}</p>`;
  } finally {
    isLoading = false;
    loading.style.display = 'none';
  }
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
  console.log('DOM loaded, setting initial state');
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    if (localStorage.getItem('theme') === 'dark-mode') {
      document.body.classList.add('dark-mode');
      themeToggle.checked = true;
    }
    themeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode');
      if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark-mode');
      } else {
        localStorage.removeItem('theme');
      }
    });
  }

  const { mode, value } = getSearchParams();
  console.log('Initial mode:', mode, 'value:', value);
  if (mode === 'category') {
    setActiveCategory(value); // Ensure "Headlines" (top) is active by default
  } else if (mode === 'search') {
    input.value = value;
    setActiveCategory(null);
  }
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

// CORS Proxy for fetching external pages
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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
  });
}

/**
 * Extracts article content from HTML string using heuristics.
 * Tries multiple strategies to find the main content.
 */
function extractArticleText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript',
    '.ad', '.ads', '.advertisement', '.social-share', '.comments', '.related',
    '.sidebar', '.menu', '.navigation', '.breadcrumb', '.author-bio',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '.share-buttons', '.newsletter', '.subscribe', '.popup', '.modal'
  ];
  removeSelectors.forEach(sel => {
    try {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    } catch (e) { /* ignore invalid selectors */ }
  });

  // Priority list of content containers (expanded)
  const contentSelectors = [
    'article',
    '[role="article"]',
    'main',
    '.article-body', '.article-content', '.article__content', '.article-text',
    '.post-content', '.post-body', '.post__content',
    '.entry-content', '.entry-body',
    '.story-body', '.story-content', '.story__body',
    '.content-body', '.content-main', '.main-content',
    '#article-body', '#article-content', '#content',
    '.news-content', '.news-body', '.newsarticle',
    '[itemprop="articleBody"]',
    '.td-post-content', '.jeg_inner_content' // Popular theme selectors
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    try {
      contentElement = doc.querySelector(selector);
      if (contentElement) break;
    } catch (e) { /* ignore */ }
  }

  // Fallback: find the element with the most <p> tags
  if (!contentElement) {
    const allContainers = doc.querySelectorAll('div, section, article');
    let maxScore = 0;
    allContainers.forEach(container => {
      const paragraphs = container.querySelectorAll('p');
      let score = 0;
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text.length > 10) score += text.length; // Lower threshold
      });
      if (score > maxScore) {
        maxScore = score;
        contentElement = container;
      }
    });
  }

  if (!contentElement) {
    contentElement = doc.body;
  }

  // Extract text from paragraphs - be very inclusive
  const paragraphs = contentElement.querySelectorAll('p');
  let text = '';
  paragraphs.forEach(p => {
    const pText = p.textContent.trim();
    // Very low threshold to catch all content
    if (pText.length > 10 && !pText.startsWith('©') && !pText.toLowerCase().includes('cookie') && !pText.toLowerCase().includes('subscribe')) {
      text += pText + '\n\n';
    }
  });

  // If limited paragraphs found, also try other text elements
  if (text.length < 200) {
    const otherElements = contentElement.querySelectorAll('div > span, li, blockquote');
    otherElements.forEach(el => {
      const elText = el.textContent.trim();
      if (elText.length > 30 && !text.includes(elText)) {
        text += elText + '\n\n';
      }
    });
  }

  // If still no paragraphs found, try getting all text and clean it up
  if (!text.trim() || text.length < 100) {
    // Get all text but filter out noise
    const allText = contentElement.textContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    // Split into sentences and rebuild as paragraphs
    const sentences = allText.match(/[^.!?]+[.!?]+/g) || [];
    const cleanSentences = sentences.filter(s =>
      s.trim().length > 20 &&
      !s.includes('cookie') &&
      !s.includes('©')
    );

    if (cleanSentences.length > 2) {
      text = cleanSentences.join(' ').replace(/\. /g, '.\n\n');
    }
  }

  return text.trim() || null;
}

/**
 * Fetches and extracts article content from the original URL.
 * Uses our own proxy API first, then falls back to public CORS proxies.
 */
async function fetchArticleContent(url) {
  // First try our own proxy (most reliable when deployed to Vercel)
  const ownProxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

  // List of proxies to try (own proxy first, then public backups)
  const proxies = [
    { url: ownProxyUrl, name: 'Own Proxy' },
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, name: 'AllOrigins' },
    { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, name: 'CorsProxy.io' },
  ];

  for (const proxy of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(proxy.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`${proxy.name} failed with status: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Check if we got actual HTML content
      if (!html || html.length < 500 || !html.includes('<')) {
        console.log(`${proxy.name} returned invalid/empty content`);
        continue;
      }

      const extracted = extractArticleText(html);

      // Only return if we got meaningful content
      if (extracted && extracted.length > 50) {
        console.log(`✓ Successfully scraped via ${proxy.name} (${extracted.length} chars)`);
        return extracted;
      } else {
        console.log(`${proxy.name} extracted insufficient content (${extracted?.length || 0} chars)`);
      }
    } catch (error) {
      console.log(`${proxy.name} error:`, error.message);
      continue;
    }
  }

  console.log('All proxies failed for:', url);
  return null;
}

/**
 * Clears any existing iframe from the read view and resets to normal mode.
 */
function clearReadViewIframe() {
  const readViewMain = document.querySelector('.read-view-main');
  const existingWrapper = document.querySelector('.iframe-wrapper');

  // Remove iframe wrapper if it exists
  if (existingWrapper) {
    existingWrapper.remove();
  }

  // Reset to normal text mode
  readViewMain.classList.remove('iframe-mode');
  readContent.style.display = '';
  readOriginalLink.style.display = '';
}

/**
 * Renders an iframe as fallback when article scraping fails.
 * The iframe fits within the read view container without causing double scrollbars.
 */
function renderIframeFallback(articleUrl) {
  const readViewMain = document.querySelector('.read-view-main');
  const readViewContent = document.querySelector('.read-view-content');

  // Hide the text content area, image, and original link (iframe replaces them)
  readContent.style.display = 'none';
  readOriginalLink.style.display = 'none';
  readImg.style.display = 'none'; // Hide image when iframe takes over

  // Add iframe mode class for proper flexbox layout
  readViewMain.classList.add('iframe-mode');

  // Create iframe wrapper for proper height calculation
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className = 'iframe-wrapper';

  // Create the iframe element
  const iframe = document.createElement('iframe');
  iframe.className = 'read-view-iframe';
  iframe.src = articleUrl;

  // Security: sandbox with necessary permissions for content to load
  // allow-same-origin: Required for many sites to function
  // allow-scripts: Required for interactive content
  // allow-popups: Allow links to open in new tabs
  iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox';

  // Accessibility and loading attributes
  iframe.title = 'Article content';
  iframe.loading = 'lazy';

  // Append iframe to wrapper, then wrapper to content area
  iframeWrapper.appendChild(iframe);
  readViewContent.appendChild(iframeWrapper);
}

async function openReadView(index) {
  const article = currentArticles[index];
  if (!article) return;

  // Clear any existing iframe from previous article
  clearReadViewIframe();

  // Show view immediately with loading state
  readTitle.textContent = article.title;
  readContent.textContent = 'Loading full article...';
  readOriginalLink.href = article.link;

  // Image handling - hide if no valid image
  const imageSrc = article.image_url;
  if (isValidImageUrl(imageSrc)) {
    readImg.src = imageSrc;
    readImg.style.display = 'block';
    readImg.onerror = () => { readImg.style.display = 'none'; };
  } else {
    readImg.style.display = 'none';
  }

  // Set source, author, and date
  readSource.textContent = article.source_id || 'Unknown Source';

  // Author - NewsData.io provides 'creator' as an array
  const readAuthor = document.getElementById('read-author');
  const metaSeparator = document.querySelector('.meta-separator');
  if (article.creator && article.creator.length > 0) {
    readAuthor.textContent = article.creator.join(', ');
    readAuthor.style.display = '';
    if (metaSeparator) metaSeparator.style.display = '';
  } else {
    readAuthor.style.display = 'none';
    if (metaSeparator) metaSeparator.style.display = 'none';
  }

  readDate.textContent = formatDate(article.pubDate);

  // Populate related articles
  populateRelatedArticles(index);

  readView.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Scroll to top of read view
  document.querySelector('.read-view-main').scrollTop = 0;

  // Attempt to scrape full content
  const scrapedContent = await fetchArticleContent(article.link);

  if (scrapedContent) {
    // Scraping succeeded - show the scraped text content
    readContent.textContent = scrapedContent;
  } else {
    // Scraping failed - show API content with prompt to read full article
    const fallbackText = article.content || article.description || '';
    const cleanText = fallbackText
      .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
      .replace(/\[\+\d+ chars\]/gi, '')
      .trim();

    if (cleanText) {
      readContent.textContent = cleanText + '\n\n📖 Tap the link below to read the full article.';
    } else {
      readContent.textContent = 'Full article content not available.\n\n📖 Tap the link below to read in your browser.';
    }
  }
}

function closeReadView() {
  readView.classList.add('hidden');
  document.body.style.overflow = '';
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
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.link === article.link);

  if (index > -1) {
    // Remove bookmark
    bookmarks.splice(index, 1);
    updateBookmarkButton(false);
  } else {
    // Add bookmark
    bookmarks.push({
      title: article.title,
      link: article.link,
      source: article.source_id,
      image: article.image_url,
      date: article.pubDate,
      savedAt: new Date().toISOString()
    });
    updateBookmarkButton(true);
  }

  saveBookmarks(bookmarks);
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
    openReadView(newIndex);
  }
}

// Update openReadView to track current index and update bookmark state
const originalOpenReadView = openReadView;
openReadView = async function (index) {
  currentArticleIndex = index;
  await originalOpenReadView(index);

  // Update bookmark button state
  const article = currentArticles[index];
  if (article) {
    updateBookmarkButton(isBookmarked(article.link));
  }
};

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

// ========== BOOKMARKS VIEW ==========

let isBookmarksView = false;

function displayBookmarks() {
  const bookmarks = getBookmarks();
  isBookmarksView = true;

  // Clear active state from all category buttons
  categoryButtons.forEach(btn => btn.classList.remove('active'));
  document.getElementById('saved-btn').classList.add('active');

  // Clear news container
  newsContainer.innerHTML = '';
  loading.style.display = 'none';

  if (bookmarks.length === 0) {
    newsContainer.innerHTML = `
      <div class="empty-bookmarks">
        <p>📚 No saved articles yet</p>
        <p style="color: var(--accent-color); font-size: 0.9rem;">
          Tap the bookmark icon when reading an article to save it here.
        </p>
      </div>
    `;
    return;
  }

  // Display bookmarked articles
  bookmarks.forEach((bookmark, index) => {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.cursor = 'pointer';
    card.style.position = 'relative';

    const imageSrc = bookmark.image || getCategoryFallbackImage('default');

    card.innerHTML = `
      <button class="remove-bookmark-btn" data-index="${index}" title="Remove bookmark">✕</button>
      <img src="${imageSrc}" alt="${bookmark.title}" loading="lazy">
      <h2>${bookmark.title}</h2>
      <small>By ${bookmark.source || 'Unknown Source'}</small>
      <small style="display: block; margin-top: 0.5rem; color: var(--accent-color);">
        Saved ${new Date(bookmark.savedAt).toLocaleDateString()}
      </small>
    `;

    // Click on card to open article
    card.addEventListener('click', (e) => {
      // Don't open if clicking remove button
      if (e.target.classList.contains('remove-bookmark-btn')) return;
      window.open(bookmark.link, '_blank');
    });

    newsContainer.appendChild(card);
  });

  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      removeBookmark(index);
    });
  });
}

function removeBookmark(index) {
  const bookmarks = getBookmarks();
  bookmarks.splice(index, 1);
  saveBookmarks(bookmarks);
  displayBookmarks(); // Refresh the view
}

// Saved button click handler
document.getElementById('saved-btn').addEventListener('click', displayBookmarks);

// Exit bookmarks view when clicking a category
categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    isBookmarksView = false;
    document.getElementById('saved-btn').classList.remove('active');
  });
});