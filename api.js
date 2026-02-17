// api.js - Real-time Scraping Engine
import { CONFIG } from 'config.js';
import { state } from 'state.js';

class ScrapingEngine {
    constructor() {
        this.abortControllers = new Map();
        this.requestQueue = [];
        this.activeRequests = 0;
        this.cache = new Map();
        this.rateLimiter = new RateLimiter(CONFIG.network.rateLimit);
        this.circuitBreaker = new CircuitBreaker(CONFIG.network.circuitBreaker);
        this.selectorEngine = new AdaptiveSelectorEngine();
        this.init();
    }

    init() {
        this.setupRequestInterceptor();
        this.startQueueProcessor();
    }

    setupRequestInterceptor() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const requestId = Math.random().toString(36).substring(7);
            const controller = new AbortController();
            this.abortControllers.set(requestId, controller);

            try {
                const response = await originalFetch(args[0], {
                    ...args[1],
                    signal: controller.signal
                });
                return response;
            } finally {
                this.abortControllers.delete(requestId);
            }
        };
    }

    async scrape(endpoint, options = {}) {
        const requestId = Math.random().toString(36).substring(7);
        
        // Check cache
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached && !options.bypassCache) {
            return cached;
        }

        // Check rate limit
        if (!this.rateLimiter.allow()) {
            throw new Error('Rate limit exceeded');
        }

        // Check circuit breaker
        if (this.circuitBreaker.isOpen()) {
            throw new Error('Circuit breaker is open');
        }

        try {
            const result = await this.makeRequest(endpoint, options, requestId);
            this.circuitBreaker.recordSuccess();
            
            // Cache result
            this.addToCache(cacheKey, result, options.ttl);
            
            return result;
        } catch (error) {
            this.circuitBreaker.recordFailure();
            state.addError(error);
            
            // Try fallback source
            if (options.fallback) {
                return await this.tryFallback(endpoint, options);
            }
            
            throw error;
        }
    }

    async makeRequest(endpoint, options, requestId) {
        const controller = this.abortControllers.get(requestId);
        const timeoutId = setTimeout(() => {
            controller?.abort();
        }, options.timeout || CONFIG.network.timeout);

        try {
            let url = endpoint;
            let response;

            // Handle different source types
            if (options.source) {
                response = await this.scrapeFromSource(options.source, endpoint, options);
            } else {
                // Use proxy if configured
                if (CONFIG.security.useProxy) {
                    url = `${CONFIG.security.corsProxy}${encodeURIComponent(endpoint)}`;
                }

                response = await fetch(url, {
                    headers: {
                        'User-Agent': CONFIG.scraping.userAgent,
                        ...options.headers
                    },
                    signal: controller?.signal
                });
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await this.parseResponse(response, options);
            
            // Validate content
            if (CONFIG.scraping.validateContent) {
                this.validateContent(data, options.validation);
            }

            // Sanitize if needed
            if (CONFIG.scraping.sanitizeHTML && typeof data === 'string') {
                return this.sanitizeHTML(data);
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    async scrapeFromSource(source, endpoint, options) {
        const sourceConfig = CONFIG.sources.find(s => s.id === source);
        if (!sourceConfig) {
            throw new Error(`Unknown source: ${source}`);
        }

        const url = `${sourceConfig.baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': CONFIG.scraping.userAgent
            }
        });

        if (!response.ok) {
            throw new Error(`Source ${source} returned ${response.status}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        return this.extractData(doc, sourceConfig.selectors, options);
    }

    extractData(doc, selectors, options) {
        const result = {};

        for (const [key, selector] of Object.entries(selectors)) {
            try {
                // Try primary selector
                let elements = doc.querySelectorAll(selector);
                
                // If no results and adaptive selectors enabled, try to find alternatives
                if (elements.length === 0 && CONFIG.scraping.adaptiveSelectors) {
                    elements = this.selectorEngine.findAlternative(doc, selector);
                }

                result[key] = this.processElements(elements, key, options);
            } catch (error) {
                console.error(`Failed to extract ${key}:`, error);
                
                // Try fallback selector
                if (options.fallbackSelectors?.[key]) {
                    const elements = doc.querySelectorAll(options.fallbackSelectors[key]);
                    result[key] = this.processElements(elements, key, options);
                }
            }
        }

        return result;
    }

    processElements(elements, key, options) {
        const processed = [];

        for (const element of elements) {
            let value;

            // Determine extraction method based on key
            if (key.includes('image') || key.includes('cover')) {
                value = element.src || element.dataset.src || element.getAttribute('data-src');
            } else if (key.includes('link') || key.includes('href')) {
                value = element.href;
            } else {
                value = element.textContent.trim();
            }

            // Apply transformations
            if (options.transform?.[key]) {
                value = options.transform[key](value);
            }

            if (value) {
                processed.push(value);
            }
        }

        return options.single ? processed[0] : processed;
    }

    async tryFallback(endpoint, options) {
        const fallbackSources = CONFIG.sources
            .filter(s => s.fallback && s.id !== options.source)
            .sort((a, b) => a.priority - b.priority);

        for (const source of fallbackSources) {
            try {
                console.log(`Trying fallback source: ${source.id}`);
                return await this.scrape(endpoint, {
                    ...options,
                    source: source.id,
                    fallback: false
                });
            } catch (error) {
                console.error(`Fallback ${source.id} failed:`, error);
                continue;
            }
        }

        throw new Error('All sources failed');
    }

    async parseResponse(response, options) {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            return await response.json();
        } else if (contentType?.includes('text/html')) {
            const html = await response.text();
            
            if (options.parseHTML) {
                return new DOMParser().parseFromString(html, 'text/html');
            }
            
            return html;
        } else if (contentType?.includes('image')) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }

        return await response.text();
    }

    validateContent(data, validation = {}) {
        if (!data) {
            throw new Error('Empty response');
        }

        if (validation.minLength && data.length < validation.minLength) {
            throw new Error('Content too short');
        }

        if (validation.requiredFields) {
            for (const field of validation.requiredFields) {
                if (!data[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
        }

        return true;
    }

    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove potentially dangerous elements
        const scripts = temp.getElementsByTagName('script');
        while (scripts.length > 0) {
            scripts[0].remove();
        }
        
        const iframes = temp.getElementsByTagName('iframe');
        while (iframes.length > 0) {
            iframes[0].remove();
        }

        return temp.innerHTML;
    }

    addToCache(key, value, ttl = CONFIG.cache.ttl.mangaList) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });

        // Auto cleanup old cache entries
        setTimeout(() => {
            this.cache.delete(key);
        }, ttl);
    }

    getFromCache(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    startQueueProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 100);
    }

    async processQueue() {
        if (this.requestQueue.length === 0 || this.activeRequests >= CONFIG.network.maxConcurrent) {
            return;
        }

        const request = this.requestQueue.shift();
        this.activeRequests++;

        try {
            const result = await this.makeRequest(request.endpoint, request.options);
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        } finally {
            this.activeRequests--;
        }
    }

    abortRequest(requestId) {
        const controller = this.abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(requestId);
        }
    }

    abortAllRequests() {
        for (const [id, controller] of this.abortControllers) {
            controller.abort();
            this.abortControllers.delete(id);
        }
    }
}

class RateLimiter {
    constructor(maxRequestsPerMinute) {
        this.maxRequests = maxRequestsPerMinute;
        this.requests = [];
    }

    allow() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 60000);

        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }

        return false;
    }
}

class CircuitBreaker {
    constructor(options) {
        this.failureThreshold = options.failureThreshold;
        this.resetTimeout = options.resetTimeout;
        this.failures = 0;
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }

    recordSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    recordFailure() {
        this.failures++;
        
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
        }
    }

    isOpen() {
        if (this.state === 'OPEN') {
            if (Date.now() > this.nextAttempt) {
                this.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }
}

class AdaptiveSelectorEngine {
    constructor() {
        this.selectorPatterns = [
            { type: 'class', pattern: /manga|series|title/i },
            { type: 'class', pattern: /chapter|episode/i },
            { type: 'class', pattern: /image|cover|thumbnail/i },
            { type: 'tag', pattern: /img|a|div|span/i },
            { type: 'attribute', pattern: /src|href|data-src/i }
        ];
    }

    findAlternative(doc, originalSelector) {
        const elements = [];

        // Try common patterns
        for (const pattern of this.selectorPatterns) {
            if (pattern.type === 'class') {
                const matches = Array.from(doc.querySelectorAll('[class*="' + pattern.pattern.source.slice(1, -2) + '"]'));
                elements.push(...matches);
            } else if (pattern.type === 'tag') {
                const matches = Array.from(doc.querySelectorAll(pattern.pattern.source));
                elements.push(...matches);
            }
        }

        // Remove duplicates
        return [...new Set(elements)];
    }
}

export const api = new ScrapingEngine();
export default api;
