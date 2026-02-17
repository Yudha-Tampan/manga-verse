// config.js - Enterprise Configuration Management
export const CONFIG = {
    // API Endpoints & Mirrors
    sources: [
        {
            id: 'mangadex',
            name: 'MangaDex',
            baseUrl: 'https://api.mangadex.org',
            listEndpoint: '/manga',
            chapterEndpoint: '/chapter',
            imageEndpoint: '/at-home/server',
            priority: 1,
            active: true,
            selectors: {
                title: 'attributes.title.en',
                cover: 'relationships.[filename]',
                chapters: 'data'
            }
        },
        {
            id: 'mangapill',
            name: 'MangaPill',
            baseUrl: 'https://mangapill.com',
            listEndpoint: '/api/manga',
            priority: 2,
            active: true,
            fallback: true
        }
    ],

    // Performance & Caching
    cache: {
        ttl: {
            mangaList: 5 * 60 * 1000, // 5 minutes
            mangaDetail: 10 * 60 * 1000, // 10 minutes
            chapters: 15 * 60 * 1000, // 15 minutes
            images: 30 * 60 * 1000 // 30 minutes
        },
        maxSize: 50 * 1024 * 1024, // 50MB
        cleanupInterval: 60 * 1000 // 1 minute
    },

    // Network & Requests
    network: {
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
        maxConcurrent: 5,
        rateLimit: 100, // requests per minute
        backoffFactor: 1.5,
        circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 30000 // 30 seconds
        }
    },

    // Scraping Engine
    scraping: {
        userAgent: 'Mangaverse/1.0',
        parseTimeout: 5000,
        maxRedirects: 3,
        validateContent: true,
        sanitizeHTML: true,
        adaptiveSelectors: true,
        selectorFallback: true,
        mirrorSwitch: true,
        contentValidation: {
            minTitleLength: 3,
            maxTitleLength: 200,
            minChapters: 1,
            maxChapters: 10000,
            allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp']
        }
    },

    // Feature Flags
    features: {
        pwa: true,
        offlineMode: true,
        recommendations: true,
        bookmarks: true,
        history: true,
        achievements: true,
        debugMode: false,
        analytics: true,
        experimentalReader: false
    },

    // UI Configuration
    ui: {
        defaultTheme: 'dark',
        defaultReaderMode: 'vertical',
        defaultFontSize: 16,
        defaultBrightness: 100,
        compactThreshold: 768,
        infiniteScroll: true,
        prefetchChapters: 2,
        imageQuality: 85,
        lazyLoadImages: true
    },

    // Security
    security: {
        corsProxy: 'https://cors-anywhere.herokuapp.com/',
        useProxy: false,
        sanitizeInput: true,
        escapeHTML: true,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        allowedDomains: ['mangadex.org', 'mangapill.com']
    },

    // Development
    dev: {
        logLevel: 'error', // debug, info, warn, error
        performanceMonitoring: true,
        memoryTracking: true,
        networkTracking: true,
        mockData: false
    }
};

// Environment-specific overrides
if (import.meta.env && import.meta.env.PROD) {
    CONFIG.dev.logLevel = 'error';
    CONFIG.features.debugMode = false;
    CONFIG.security.useProxy = true;
}

export default CONFIG;