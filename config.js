const CONFIG = {
    APP: {
        NAME: 'MangaVerse',
        VERSION: '1.0.0',
        DEFAULT_VIEW: 'home'
    },
    
    API: {
        SOURCES: [
            {
                id: 'manga1',
                url: 'https://ww5.manganelo.tv',
                priority: 1,
                health: 1.0,
                selectors: {
                    manga: '.content-genres-item',
                    title: '.genres-item-name',
                    image: 'img',
                    chapter: '.genres-item-chap',
                    rating: '.genres-item-rate'
                },
                fallbackSelectors: {
                    manga: '.panel-content-genres-item',
                    title: '.genres-item-name',
                    image: 'img',
                    chapter: '.chapter-item',
                    rating: '.item-rate'
                }
            },
            {
                id: 'manga2',
                url: 'https://mangabat.com',
                priority: 2,
                health: 1.0,
                selectors: {
                    manga: '.list-truyen-item-wrap',
                    title: '.jtip',
                    image: 'img',
                    chapter: '.chapter-item',
                    rating: '.rate-this'
                },
                fallbackSelectors: {
                    manga: '.item',
                    title: 'h3 a',
                    image: 'img',
                    chapter: '.chapter a',
                    rating: '.rating'
                }
            }
        ],
        
        CACHE: {
            TTL: 5 * 60 * 1000, // 5 minutes
            MAX_SIZE: 100,
            WARMUP_INTERVAL: 30 * 1000 // 30 seconds
        },
        
        RATE_LIMIT: {
            MAX_REQUESTS: 10,
            WINDOW: 1000, // 1 second
            MAX_CONCURRENT: 3
        },
        
        RETRY: {
            MAX_ATTEMPTS: 3,
            BASE_DELAY: 1000,
            MAX_DELAY: 5000
        },
        
        CIRCUIT_BREAKER: {
            THRESHOLD: 5,
            TIMEOUT: 30000 // 30 seconds
        }
    },
    
    UI: {
        GRID_COLS: {
            mobile: 2,
            tablet: 4,
            desktop: 6
        },
        SKELETON_COUNT: 12,
        LAZY_LOAD_OFFSET: 200,
        TRANSITIONS: {
            DURATION: 300,
            EASING: 'ease'
        }
    }
};

Object.freeze(CONFIG);