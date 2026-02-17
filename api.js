const API = (function() {
    // Private variables
    const requestQueue = [];
    let activeRequests = 0;
    const abortControllers = new Map();
    const circuitBreakers = new Map();
    const requestFingerprints = new Set();
    const sourceHealth = new Map();
    
    // Initialize source health
    CONFIG.API.SOURCES.forEach(source => {
        sourceHealth.set(source.id, {
            health: 1.0,
            failures: 0,
            lastFailure: 0,
            blacklistedUntil: 0
        });
    });
    
    // Adaptive selectors storage
    const selectorScores = new Map();
    
    // Core scraping function
    async function scrape(url, options = {}) {
        const fingerprint = `${url}_${JSON.stringify(options)}`;
        
        // Deduplicate requests
        if (requestFingerprints.has(fingerprint)) {
            return null;
        }
        requestFingerprints.add(fingerprint);
        setTimeout(() => requestFingerprints.delete(fingerprint), 5000);
        
        // Check circuit breaker
        const sourceId = options.sourceId || 'default';
        if (isCircuitBroken(sourceId)) {
            console.warn(`Circuit breaker open for ${sourceId}`);
            return fallbackScrape(url, options);
        }
        
        // Rate limiting
        await rateLimit(sourceId);
        
        // Queue management
        if (activeRequests >= CONFIG.API.RATE_LIMIT.MAX_CONCURRENT) {
            await new Promise(resolve => requestQueue.push(resolve));
        }
        
        activeRequests++;
        
        const abortController = new AbortController();
        const requestId = `${url}_${Date.now()}`;
        abortControllers.set(requestId, abortController);
        
        let retries = 0;
        let lastError;
        
        while (retries < CONFIG.API.RETRY.MAX_ATTEMPTS) {
            try {
                const response = await fetchWithTimeout(url, {
                    signal: abortController.signal,
                    ...options
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                const doc = parseAndSanitize(html);
                const data = extractData(doc, options.selectors);
                
                // Update source health on success
                updateSourceHealth(sourceId, true);
                
                // Cache the result
                cacheResult(url, data);
                
                return data;
                
            } catch (error) {
                lastError = error;
                retries++;
                
                if (retries < CONFIG.API.RETRY.MAX_ATTEMPTS) {
                    const delay = exponentialBackoff(retries);
                    await wait(delay);
                }
            }
        }
        
        // Update source health on failure
        updateSourceHealth(sourceId, false);
        
        // Try fallback source
        return fallbackScrape(url, options);
    }
    
    // Fetch with timeout
    async function fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Exponential backoff
    function exponentialBackoff(retryCount) {
        const delay = CONFIG.API.RETRY.BASE_DELAY * Math.pow(2, retryCount - 1);
        return Math.min(delay, CONFIG.API.RETRY.MAX_DELAY);
    }
    
    // Rate limiting
    async function rateLimit(sourceId) {
        const now = Date.now();
        const source = sourceHealth.get(sourceId);
        
        if (source) {
            const timeSinceLastRequest = now - (source.lastRequest || 0);
            if (timeSinceLastRequest < 1000 / CONFIG.API.RATE_LIMIT.MAX_REQUESTS) {
                await wait(1000 / CONFIG.API.RATE_LIMIT.MAX_REQUESTS - timeSinceLastRequest);
            }
            source.lastRequest = now;
        }
    }
    
    // Circuit breaker
    function isCircuitBroken(sourceId) {
        const breaker = circuitBreakers.get(sourceId);
        if (!breaker) return false;
        
        if (breaker.failures >= CONFIG.API.CIRCUIT_BREAKER.THRESHOLD) {
            if (Date.now() - breaker.lastFailure > CONFIG.API.CIRCUIT_BREAKER.TIMEOUT) {
                circuitBreakers.delete(sourceId);
                return false;
            }
            return true;
        }
        return false;
    }
    
    // Update source health
    function updateSourceHealth(sourceId, success) {
        const health = sourceHealth.get(sourceId) || {
            health: 1.0,
            failures: 0,
            lastFailure: 0
        };
        
        if (success) {
            health.health = Math.min(1.0, health.health + 0.1);
            health.failures = 0;
        } else {
            health.health = Math.max(0, health.health - 0.2);
            health.failures++;
            health.lastFailure = Date.now();
            
            if (health.failures >= CONFIG.API.CIRCUIT_BREAKER.THRESHOLD) {
                circuitBreakers.set(sourceId, {
                    failures: health.failures,
                    lastFailure: Date.now()
                });
            }
        }
        
        sourceHealth.set(sourceId, health);
    }
    
    // Parse and sanitize HTML
    function parseAndSanitize(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove potentially harmful elements
        const scripts = doc.getElementsByTagName('script');
        while (scripts.length > 0) {
            scripts[0].remove();
        }
        
        return doc;
    }
    
    // Extract data with adaptive selectors
    function extractData(doc, selectors) {
        const data = [];
        
        // Try primary selectors
        let items = doc.querySelectorAll(selectors.manga);
        
        // If no items, try fallback selectors
        if (items.length === 0 && selectors.fallback) {
            items = doc.querySelectorAll(selectors.fallback.manga);
            updateSelectorScore(selectors.manga, false);
        }
        
        items.forEach(item => {
            try {
                const manga = {
                    id: generateId(),
                    title: extractText(item, selectors.title),
                    image: extractImage(item, selectors.image),
                    chapters: extractChapters(item, selectors.chapter),
                    rating: extractRating(item, selectors.rating),
                    lastUpdated: Date.now()
                };
                
                // Validate and normalize
                if (validateManga(manga)) {
                    data.push(normalizeManga(manga));
                }
            } catch (error) {
                console.warn('Error extracting manga:', error);
            }
        });
        
        return data;
    }
    
    // Extract text with fallback
    function extractText(element, selector) {
        const el = element.querySelector(selector);
        return el ? el.textContent.trim() : 'Unknown Title';
    }
    
    // Extract image URL
    function extractImage(element, selector) {
        const img = element.querySelector(selector);
        if (!img) return 'https://via.placeholder.com/200x300?text=No+Image';
        
        let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        
        // Normalize URL
        if (src && !src.startsWith('http')) {
            src = 'https:' + src;
        }
        
        return src || 'https://via.placeholder.com/200x300?text=No+Image';
    }
    
    // Extract chapters
    function extractChapters(element, selector) {
        const chapterEl = element.querySelector(selector);
        if (!chapterEl) return 0;
        
        const text = chapterEl.textContent;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }
    
    // Extract rating
    function extractRating(element, selector) {
        const ratingEl = element.querySelector(selector);
        if (!ratingEl) return 0;
        
        const text = ratingEl.textContent;
        const match = text.match(/\d+\.?\d*/);
        return match ? parseFloat(match[0]) : 0;
    }
    
    // Validate manga data
    function validateManga(manga) {
        return manga.title && manga.title !== 'Unknown Title';
    }
    
    // Normalize manga schema
    function normalizeManga(manga) {
        return {
            ...manga,
            normalizedTitle: manga.title.toLowerCase().replace(/[^\w\s]/g, ''),
            popularity: calculatePopularity(manga),
            trending: calculateTrending(manga)
        };
    }
    
    // Calculate popularity score
    function calculatePopularity(manga) {
        return (manga.rating * 0.6) + (manga.chapters * 0.4);
    }
    
    // Calculate trending score
    function calculateTrending(manga) {
        const age = (Date.now() - manga.lastUpdated) / (1000 * 60 * 60 * 24);
        return manga.popularity * Math.exp(-age * 0.1);
    }
    
    // Update selector score for adaptive learning
    function updateSelectorScore(selector, success) {
        const score = selectorScores.get(selector) || 0;
        selectorScores.set(selector, success ? score + 1 : score - 1);
    }
    
    // Generate unique ID
    function generateId() {
        return 'manga_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Cache management
    const cache = new Map();
    
    function cacheResult(key, data) {
        cache.set(key, {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + CONFIG.API.CACHE.TTL
        });
        
        // Rotate cache if too large
        if (cache.size > CONFIG.API.CACHE.MAX_SIZE) {
            const oldest = Array.from(cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            cache.delete(oldest[0]);
        }
    }
    
    function getCached(key) {
        const cached = cache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }
        cache.delete(key);
        return null;
    }
    
    // Fallback to mirror source
    async function fallbackScrape(url, options) {
        const sources = CONFIG.API.SOURCES
            .filter(s => s.id !== options.sourceId)
            .sort((a, b) => a.priority - b.priority);
        
        for (const source of sources) {
            if (!isCircuitBroken(source.id)) {
                try {
                    const data = await scrape(source.url + url, {
                        ...options,
                        sourceId: source.id,
                        selectors: source.selectors
                    });
                    if (data) return data;
                } catch (error) {
                    console.warn(`Fallback failed for ${source.id}:`, error);
                }
            }
        }
        
        return null;
    }
    
    // Wait utility
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Prefetch next page
    async function prefetchNextPage(currentPage) {
        if (activeRequests >= CONFIG.API.RATE_LIMIT.MAX_CONCURRENT) return;
        
        const nextPage = currentPage + 1;
        const url = `/page/${nextPage}`;
        
        // Use requestIdleCallback for non-blocking prefetch
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                scrape(url, { prefetch: true });
            }, { timeout: 2000 });
        } else {
            setTimeout(() => scrape(url, { prefetch: true }), 1000);
        }
    }
    
    // Public API
    return {
        async getMangaList(page = 1, filters = {}) {
            const cacheKey = `mangalist_${page}_${JSON.stringify(filters)}`;
            const cached = getCached(cacheKey);
            if (cached) return cached;
            
            const source = CONFIG.API.SOURCES[0];
            const data = await scrape(source.url + '/manga-list', {
                sourceId: source.id,
                selectors: source.selectors
            });
            
            // Prefetch next page in background
            prefetchNextPage(page);
            
            return data;
        },
        
        async getMangaDetails(id) {
            const cacheKey = `manga_${id}`;
            const cached = getCached(cacheKey);
            if (cached) return cached;
            
            const source = CONFIG.API.SOURCES[0];
            return await scrape(source.url + `/manga/${id}`, {
                sourceId: source.id,
                selectors: source.selectors
            });
        },
        
        async searchManga(query) {
            const cacheKey = `search_${query}`;
            const cached = getCached(cacheKey);
            if (cached) return cached;
            
            const source = CONFIG.API.SOURCES[0];
            return await scrape(source.url + `/search?q=${encodeURIComponent(query)}`, {
                sourceId: source.id,
                selectors: source.selectors
            });
        },
        
        async getTrending() {
            const data = await this.getMangaList();
            return data.sort((a, b) => b.trending - a.trending);
        },
        
        async getPopular() {
            const data = await this.getMangaList();
            return data.sort((a, b) => b.popularity - a.popularity);
        },
        
        async getLatest() {
            const data = await this.getMangaList();
            return data.sort((a, b) => b.lastUpdated - a.lastUpdated);
        },
        
        // Cancel stale requests
        cancelRequest(requestId) {
            const controller = abortControllers.get(requestId);
            if (controller) {
                controller.abort();
                abortControllers.delete(requestId);
            }
        },
        
        // Clear cache
        clearCache() {
            cache.clear();
        },
        
        // Get source health
        getSourceHealth() {
            return Object.fromEntries(sourceHealth);
        }
    };
})();

window.API = API;