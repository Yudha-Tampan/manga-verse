// app.js - Main Application Entry Point
import { CONFIG } from './config.js';
import { state } from './state.js';
import { api } from './api.js';
import { Components } from './components.js';

class MangaverseApp {
    constructor() {
        this.currentRoute = 'home';
        this.currentParams = {};
        this.container = document.getElementById('app');
        this.toastContainer = document.getElementById('toast-container');
        this.modalContainer = document.getElementById('modal-container');
        this.intersectionObserver = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.virtualScroller = null;
        
        this.init();
    }

    async init() {
        this.setupEventDelegation();
        this.setupIntersectionObserver();
        this.setupRouter();
        this.setupPerformanceMonitoring();
        this.setupPrefetching();
        this.setupAccessibility();
        
        // Initial render
        await this.handleRoute();
        
        // Warm up cache
        this.warmupCache();
    }

    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (target) {
                const action = target.dataset.action;
                this.handleAction(action, target, e);
            }
            
            // Handle navigation
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.dataset.route;
                this.navigate(route);
            }
            
            // Handle manga cards
            const card = e.target.closest('[data-manga-id]');
            if (card && !e.target.closest('[data-action]')) {
                const mangaId = card.dataset.mangaId;
                this.navigate('manga', { id: mangaId });
            }
        });

        // Handle search input
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-search-input]')) {
                this.handleSearch(e.target.value);
            }
        });

        // Handle scroll for infinite scroll
        window.addEventListener('scroll', () => {
            this.handleInfiniteScroll();
            this.updateScrollProgress();
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseBackgroundTasks();
            } else {
                this.resumeBackgroundTasks();
            }
        });
    }

    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Lazy load images
                    const img = entry.target.querySelector('img[data-src]');
                    if (img) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    
                    // Prefetch next page
                    if (entry.target.dataset.page) {
                        this.prefetchNextPage(parseInt(entry.target.dataset.page));
                    }
                }
            });
        }, {
            rootMargin: '200px',
            threshold: 0.1
        });
    }

    setupRouter() {
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('popstate', () => this.handleRoute());
    }

    setupPerformanceMonitoring() {
        if (CONFIG.dev.performanceMonitoring) {
            this.performanceMonitor.start();
        }
    }

    setupPrefetching() {
        // Prefetch on hover
        document.addEventListener('mouseenter', (e) => {
            const card = e.target.closest('[data-manga-id]');
            if (card) {
                const mangaId = card.dataset.mangaId;
                this.prefetchMangaData(mangaId);
            }
        }, { passive: true });

        // Prefetch next chapter while reading
        if (state.get('reader.currentChapter')) {
            this.prefetchNextChapter();
        }
    }

    setupAccessibility() {
        // Add ARIA labels
        document.body.setAttribute('aria-live', 'polite');
        
        // Handle reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const [route, ...params] = hash.split('/');
        
        this.currentRoute = route || 'home';
        this.currentParams = this.parseParams(params);
        
        // Update active nav links
        document.querySelectorAll('[data-route]').forEach(link => {
            link.classList.toggle('active', link.dataset.route === this.currentRoute);
        });
        
        // Render route
        await this.renderRoute();
        
        // Update meta tags
        this.updateMetaTags();
        
        // Track page view
        this.trackPageView();
    }

    parseParams(params) {
        const parsed = {};
        
        if (params.length === 1 && params[0]) {
            parsed.id = params[0];
        }
        
        return parsed;
    }

    async renderRoute() {
        const startTime = performance.now();
        
        // Show skeleton immediately
        this.renderSkeleton();
        
        try {
            let content = '';
            
            switch (this.currentRoute) {
                case 'home':
                    content = await this.renderHome();
                    break;
                case 'manga':
                    content = await this.renderMangaDetail(this.currentParams.id);
                    break;
                case 'chapter':
                    content = await this.renderChapter(this.currentParams.id);
                    break;
                case 'library':
                    content = this.renderLibrary();
                    break;
                case 'history':
                    content = this.renderHistory();
                    break;
                case 'bookmarks':
                    content = this.renderBookmarks();
                    break;
                case 'profile':
                    content = this.renderProfile();
                    break;
                case 'search':
                    content = this.renderSearch();
                    break;
                default:
                    content = await this.renderHome();
            }
            
            // Progressive render
            this.container.innerHTML = content;
            
            // Attach observers after render
            this.attachObservers();
            
            // Log performance
            const renderTime = performance.now() - startTime;
            if (renderTime > 100) {
                console.warn(`Slow render: ${renderTime}ms for route ${this.currentRoute}`);
            }
        } catch (error) {
            console.error('Render error:', error);
            this.showError(error);
        }
    }

    renderSkeleton() {
        const skeletonContent = Array(12).fill(Components.SkeletonCard()).join('');
        
        this.container.innerHTML = `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto">
                    <div class="manga-grid">
                        ${skeletonContent}
                    </div>
                </div>
            </div>
        `;
    }

    async renderHome() {
        try {
            const mangaList = await this.getMangaList();
            
            return `
                <div class="pt-20">
                    <div class="max-w-7xl mx-auto px-4">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-6">
                            <h1 class="text-2xl font-bold">Discover</h1>
                            <div class="flex items-center space-x-2">
                                ${Components.GenreFilter(state.get('ui.filters.genres'))}
                            </div>
                        </div>
                        
                        <!-- Search Bar -->
                        <div class="mb-6">
                            ${Components.SearchBar(state.get('ui.search'))}
                        </div>
                        
                        <!-- Featured Section -->
                        <div class="mb-8">
                            <h2 class="text-lg font-semibold mb-4">Popular Now</h2>
                            <div class="flex overflow-x-auto space-x-4 pb-4">
                                ${mangaList.slice(0, 10).map(manga => `
                                    <div class="flex-none w-32">
                                        ${Components.MangaCard(manga)}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- All Manga Grid -->
                        <div class="manga-grid" id="manga-grid">
                            ${mangaList.map((manga, index) => Components.MangaCard(manga, index)).join('')}
                        </div>
                        
                        <!-- Load More Sentinel -->
                        <div class="h-10" data-page="1" id="load-more-sentinel"></div>
                    </div>
                </div>
                
                <!-- Floating Action Button -->
                ${Components.FloatingAction(
                    '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>',
                    'bookmark'
                )}
                
                <!-- Scroll Progress -->
                ${Components.ScrollTracker()}
                
                <!-- Dev Panel -->
                ${Components.DevPanel(this.performanceMonitor.getMetrics())}
            `;
        } catch (error) {
            return this.renderError(error);
        }
    }

    async renderMangaDetail(mangaId) {
        try {
            const manga = await this.getMangaDetail(mangaId);
            const chapters = await this.getChapters(mangaId);
            
            return `
                <div class="pt-20 pb-10">
                    <div class="max-w-7xl mx-auto px-4">
                        <!-- Manga Header -->
                        <div class="flex flex-col md:flex-row gap-8 mb-8">
                            <!-- Cover -->
                            <div class="flex-none w-48 md:w-64">
                                <div class="aspect-[2/3] rounded-xl overflow-hidden">
                                    <img src="${manga.cover}" alt="${manga.title}" class="w-full h-full object-cover">
                                </div>
                            </div>
                            
                            <!-- Info -->
                            <div class="flex-1">
                                <h1 class="text-3xl font-bold mb-2">${manga.title}</h1>
                                
                                <div class="flex flex-wrap gap-2 mb-4">
                                    ${manga.genres?.map(genre => `
                                        <span class="px-2 py-1 glass rounded-full text-xs">${genre}</span>
                                    `).join('')}
                                </div>
                                
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div class="glass p-3 rounded-lg">
                                        <div class="text-xs text-gray-400">Status</div>
                                        <div class="font-semibold">${manga.status || 'Ongoing'}</div>
                                    </div>
                                    <div class="glass p-3 rounded-lg">
                                        <div class="text-xs text-gray-400">Chapters</div>
                                        <div class="font-semibold">${chapters.length}</div>
                                    </div>
                                    <div class="glass p-3 rounded-lg">
                                        <div class="text-xs text-gray-400">Rating</div>
                                        <div class="font-semibold">⭐ ${manga.rating || 'N/A'}</div>
                                    </div>
                                    <div class="glass p-3 rounded-lg">
                                        <div class="text-xs text-gray-400">Views</div>
                                        <div class="font-semibold">${manga.views?.toLocaleString() || '0'}</div>
                                    </div>
                                </div>
                                
                                <p class="text-gray-300 leading-relaxed">${manga.description || 'No description available.'}</p>
                                
                                <div class="flex gap-3 mt-6">
                                    <button class="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors" 
                                            data-action="readFirst" data-manga-id="${mangaId}">
                                        Read First Chapter
                                    </button>
                                    <button class="px-6 py-3 glass hover:bg-white/10 rounded-lg font-semibold transition-colors"
                                            data-action="bookmark" data-manga-id="${mangaId}">
                                        ${state.get('manga.bookmarked').has(mangaId) ? '✓ Bookmarked' : '+ Bookmark'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Chapters -->
                        <div>
                            <h2 class="text-xl font-semibold mb-4">Chapters</h2>
                            ${Components.ChapterList(chapters, mangaId)}
                        </div>
                        
                        <!-- Recommendations -->
                        <div class="mt-8">
                            ${Components.RecommendationPanel(this.getRecommendations(manga))}
                        </div>
                    </div>
                </div>
                
                <!-- Floating Action Button -->
                ${Components.FloatingAction(
                    '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
                    'backToTop',
                    'Back to top'
                )}
            `;
        } catch (error) {
            return this.renderError(error);
        }
    }

    async renderChapter(chapterId) {
        try {
            const [mangaId, chapterNum] = chapterId.split('-');
            const pages = await this.getChapterPages(mangaId, chapterNum);
            const currentPage = state.get('reader.currentPage') || 0;
            const readingMode = state.get('reader.readingMode');
            
            return `
                <div class="pt-16">
                    <!-- Reader Header -->
                    <div class="fixed top-0 left-0 right-0 glass z-30 h-16 flex items-center justify-between px-4">
                        <button class="p-2 hover:glass rounded-lg" data-action="back">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        
                        <div class="flex items-center space-x-4">
                            <span class="text-sm">Chapter ${chapterNum}</span>
                            
                            <button class="p-2 hover:glass rounded-lg" data-action="toggleMode">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                                </svg>
                            </button>
                            
                            <button class="p-2 hover:glass rounded-lg" data-action="settings">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            <span class="text-sm" id="page-indicator">${currentPage + 1}/${pages.length}</span>
                        </div>
                    </div>
                    
                    <!-- Reader Content -->
                    <div class="mt-16" id="reader-container">
                        ${Components.ReaderView(pages, currentPage, readingMode)}
                    </div>
                    
                    <!-- Reader Footer (hidden by default, appears on tap) -->
                    <div class="fixed bottom-0 left-0 right-0 glass z-30 transform translate-y-full transition-transform duration-300"
                         id="reader-footer">
                        <div class="flex items-center justify-between p-4">
                            <button class="p-2 hover:glass rounded-lg" data-action="prevChapter">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            
                            <input type="range" min="1" max="${pages.length}" value="${currentPage + 1}" 
                                   class="flex-1 mx-4" id="page-slider">
                            
                            <button class="p-2 hover:glass rounded-lg" data-action="nextChapter">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            return this.renderError(error);
        }
    }

    renderLibrary() {
        const bookmarks = Array.from(state.get('manga.bookmarked'));
        const history = state.get('manga.history');
        
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4">
                    <h1 class="text-2xl font-bold mb-6">My Library</h1>
                    
                    <!-- Tabs -->
                    <div class="flex border-b border-gray-800 mb-6">
                        <button class="px-4 py-2 font-medium text-blue-400 border-b-2 border-blue-400" data-tab="bookmarks">
                            Bookmarks
                        </button>
                        <button class="px-4 py-2 font-medium text-gray-400" data-tab="history">
                            History
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div id="library-content">
                        ${Components.BookmarkPanel(bookmarks)}
                    </div>
                </div>
            </div>
        `;
    }

    renderHistory() {
        const history = state.get('manga.history');
        
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4">
                    <h1 class="text-2xl font-bold mb-6">Reading History</h1>
                    ${Components.HistoryPanel(history)}
                </div>
            </div>
        `;
    }

    renderBookmarks() {
        const bookmarks = Array.from(state.get('manga.bookmarked'));
        
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4">
                    <h1 class="text-2xl font-bold mb-6">Bookmarks</h1>
                    ${Components.BookmarkPanel(bookmarks)}
                </div>
            </div>
        `;
    }

    renderProfile() {
        const user = state.get('user');
        
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="glass rounded-2xl p-8 mb-8">
                        <div class="flex items-center space-x-4">
                            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-2xl font-bold">
                                ${user.id?.charAt(0).toUpperCase() || 'G'}
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold">Guest User</h1>
                                <p class="text-gray-400">Level ${user.level} • ${user.streak} day streak</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Stats -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div class="glass p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-blue-400">${state.get('manga.history').length}</div>
                            <div class="text-xs text-gray-400">Read</div>
                        </div>
                        <div class="glass p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-purple-400">${state.get('manga.bookmarked').size}</div>
                            <div class="text-xs text-gray-400">Bookmarks</div>
                        </div>
                        <div class="glass p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-green-400">${user.achievements?.length || 0}</div>
                            <div class="text-xs text-gray-400">Achievements</div>
                        </div>
                        <div class="glass p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-yellow-400">${user.streak}</div>
                            <div class="text-xs text-gray-400">Day Streak</div>
                        </div>
                    </div>
                    
                    <!-- Settings -->
                    <div class="glass rounded-2xl p-6">
                        <h2 class="text-lg font-semibold mb-4">Settings</h2>
                        ${Components.SettingsPanel(state.get('ui'))}
                    </div>
                </div>
            </div>
        `;
    }

    renderSearch() {
        const query = state.get('ui.search');
        
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="mb-6">
                        ${Components.SearchBar(query)}
                    </div>
                    
                    <div id="search-results" class="manga-grid">
                        <!-- Results will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    renderError(error) {
        return `
            <div class="pt-20">
                <div class="max-w-7xl mx-auto px-4 text-center py-20">
                    <div class="glass rounded-2xl p-8">
                        <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h2 class="text-xl font-semibold mb-2">Something went wrong</h2>
                        <p class="text-gray-400 mb-4">${error.message}</p>
                        <button class="px-4 py-2 glass hover:bg-white/10 rounded-lg" data-action="retry">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async handleAction(action, target, event) {
        switch (action) {
            case 'search':
                this.navigate('search');
                break;
                
            case 'settings':
                this.showSettings();
                break;
                
            case 'bookmark':
                const mangaId = target.dataset.mangaId;
                this.toggleBookmark(mangaId);
                break;
                
            case 'readFirst':
                const id = target.dataset.mangaId;
                await this.readFirstChapter(id);
                break;
                
            case 'back':
                window.history.back();
                break;
                
            case 'backToTop':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
                
            case 'toggleMode':
                this.toggleReadingMode();
                break;
                
            case 'prevChapter':
                await this.navigateToPrevChapter();
                break;
                
            case 'nextChapter':
                await this.navigateToNextChapter();
                break;
                
            case 'clearCache':
                this.clearCache();
                break;
                
            case 'exportData':
                this.exportData();
                break;
                
            case 'retry':
                await this.handleRoute();
                break;
        }
    }

    async handleSearch(query) {
        state.set('ui.search', query);
        
        if (query.length < 3) return;
        
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            try {
                const results = await this.searchManga(query);
                this.renderSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }, 300);
    }

    handleInfiniteScroll() {
        const sentinel = document.getElementById('load-more-sentinel');
        if (!sentinel) return;
        
        const rect = sentinel.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight + 100;
        
        if (isVisible) {
            const currentPage = parseInt(sentinel.dataset.page || '1');
            this.loadMoreManga(currentPage + 1);
        }
    }

    updateScrollProgress() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        const progressBar = document.querySelector('[data-scroll-progress]');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    }

    handleKeyboard(event) {
        if (this.currentRoute === 'chapter') {
            switch (event.key) {
                case 'ArrowLeft':
                    this.navigateToPrevPage();
                    break;
                case 'ArrowRight':
                    this.navigateToNextPage();
                    break;
                case ' ':
                    event.preventDefault();
                    this.toggleReaderFooter();
                    break;
            }
        }
    }

    navigate(route, params = {}) {
        const hash = params.id ? `#/${route}/${params.id}` : `#/${route}`;
        window.location.hash = hash;
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = Components.Toast(message, type);
        this.toastContainer.insertAdjacentHTML('beforeend', toast);
        
        const toastElement = this.toastContainer.lastElementChild;
        
        setTimeout(() => {
            toastElement.remove();
        }, duration);
    }

    showModal(title, content, actions = []) {
        const modal = Components.Modal(title, content, actions);
        this.modalContainer.innerHTML = modal;
        this.modalContainer.style.pointerEvents = 'auto';
    }

    hideModal() {
        this.modalContainer.innerHTML = '';
        this.modalContainer.style.pointerEvents = 'none';
    }

    showSettings() {
        this.showModal(
            'Settings',
            Components.SettingsPanel(state.get('ui')),
            [
                { id: 'save', label: 'Save', primary: true },
                { id: 'cancel', label: 'Cancel' }
            ]
        );
    }

    attachObservers() {
        // Observe images for lazy loading
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.intersectionObserver.observe(img);
        });
        
        // Observe load-more sentinel
        const sentinel = document.getElementById('load-more-sentinel');
        if (sentinel) {
            this.intersectionObserver.observe(sentinel);
        }
    }

    async getMangaList(page = 1) {
        const cacheKey = `manga-list-${page}`;
        const cached = state.get('manga.cache').get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CONFIG.cache.ttl.mangaList) {
            return cached.value;
        }
        
        try {
            const data = await api.scrape('/manga', {
                source: 'mangadex',
                params: { page, limit: 50 },
                validation: {
                    requiredFields: ['data']
                }
            });
            
            const mangaList = this.normalizeMangaList(data);
            
            // Update cache
            state.get('manga.cache').set(cacheKey, {
                value: mangaList,
                timestamp: Date.now()
            });
            
            return mangaList;
        } catch (error) {
            console.error('Failed to fetch manga list:', error);
            return [];
        }
    }

    async getMangaDetail(mangaId) {
        const cacheKey = `manga-detail-${mangaId}`;
        const cached = state.get('manga.cache').get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CONFIG.cache.ttl.mangaDetail) {
            return cached.value;
        }
        
        try {
            const data = await api.scrape(`/manga/${mangaId}`, {
                source: 'mangadex'
            });
            
            const manga = this.normalizeMangaDetail(data);
            
            state.get('manga.cache').set(cacheKey, {
                value: manga,
                timestamp: Date.now()
            });
            
            return manga;
        } catch (error) {
            console.error('Failed to fetch manga detail:', error);
            throw error;
        }
    }

    async getChapters(mangaId) {
        const cacheKey = `chapters-${mangaId}`;
        const cached = state.get('manga.cache').get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CONFIG.cache.ttl.chapters) {
            return cached.value;
        }
        
        try {
            const data = await api.scrape(`/manga/${mangaId}/chapters`, {
                source: 'mangadex'
            });
            
            const chapters = this.normalizeChapters(data);
            
            state.get('manga.cache').set(cacheKey, {
                value: chapters,
                timestamp: Date.now()
            });
            
            return chapters;
        } catch (error) {
            console.error('Failed to fetch chapters:', error);
            return [];
        }
    }

    async getChapterPages(mangaId, chapterNum) {
        const cacheKey = `pages-${mangaId}-${chapterNum}`;
        const cached = state.get('manga.cache').get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CONFIG.cache.ttl.images) {
            return cached.value;
        }
        
        try {
            const data = await api.scrape(`/chapter/${mangaId}/${chapterNum}`, {
                source: 'mangadex'
            });
            
            const pages = this.normalizePages(data);
            
            state.get('manga.cache').set(cacheKey, {
                value: pages,
                timestamp: Date.now()
            });
            
            return pages;
        } catch (error) {
            console.error('Failed to fetch chapter pages:', error);
            return [];
        }
    }

    async searchManga(query) {
        try {
            const data = await api.scrape('/search', {
                source: 'mangadex',
                params: { q: query }
            });
            
            return this.normalizeMangaList(data);
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }

    async loadMoreManga(page) {
        const mangaList = await this.getMangaList(page);
        const grid = document.getElementById('manga-grid');
        
        if (grid && mangaList.length) {
            const html = mangaList.map(manga => Components.MangaCard(manga)).join('');
            grid.insertAdjacentHTML('beforeend', html);
            
            // Update sentinel
            const sentinel = document.getElementById('load-more-sentinel');
            if (sentinel) {
                sentinel.dataset.page = page;
            }
        }
    }

    async readFirstChapter(mangaId) {
        const chapters = await this.getChapters(mangaId);
        if (chapters.length) {
            const firstChapter = chapters[0];
            this.navigate('chapter', { id: `${mangaId}-${firstChapter.number}` });
        }
    }

    async navigateToPrevChapter() {
        const current = state.get('reader.currentChapter');
        if (current) {
            const [mangaId, chapterNum] = current.split('-');
            const prevChapter = parseInt(chapterNum) - 1;
            if (prevChapter > 0) {
                this.navigate('chapter', { id: `${mangaId}-${prevChapter}` });
            }
        }
    }

    async navigateToNextChapter() {
        const current = state.get('reader.currentChapter');
        if (current) {
            const [mangaId, chapterNum] = current.split('-');
            const nextChapter = parseInt(chapterNum) + 1;
            this.navigate('chapter', { id: `${mangaId}-${nextChapter}` });
        }
    }

    navigateToPrevPage() {
        const currentPage = state.get('reader.currentPage');
        if (currentPage > 0) {
            state.set('reader.currentPage', currentPage - 1);
            this.scrollToPage(currentPage - 1);
        }
    }

    navigateToNextPage() {
        const currentPage = state.get('reader.currentPage');
        const totalPages = state.get('reader.pages').length;
        
        if (currentPage < totalPages - 1) {
            state.set('reader.currentPage', currentPage + 1);
            this.scrollToPage(currentPage + 1);
        } else {
            // Auto next chapter
            this.navigateToNextChapter();
        }
    }

    scrollToPage(pageIndex) {
        const pages = document.querySelectorAll('[data-page-index]');
        if (pages[pageIndex]) {
            pages[pageIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    toggleReaderFooter() {
        const footer = document.getElementById('reader-footer');
        if (footer) {
            footer.classList.toggle('translate-y-full');
        }
    }

    toggleReadingMode() {
        const currentMode = state.get('reader.readingMode');
        const newMode = currentMode === 'vertical' ? 'horizontal' : 'vertical';
        state.set('reader.readingMode', newMode);
        
        // Re-render reader with new mode
        this.handleRoute();
    }

    toggleBookmark(mangaId) {
        const bookmarks = state.get('manga.bookmarked');
        
        if (bookmarks.has(mangaId)) {
            bookmarks.delete(mangaId);
            this.showToast('Removed from bookmarks', 'info');
        } else {
            bookmarks.add(mangaId);
            this.showToast('Added to bookmarks', 'success');
        }
        
        // Update UI if needed
        const bookmarkBtn = document.querySelector(`[data-action="bookmark"][data-manga-id="${mangaId}"]`);
        if (bookmarkBtn) {
            bookmarkBtn.textContent = bookmarks.has(mangaId) ? '✓ Bookmarked' : '+ Bookmark';
        }
    }

    clearCache() {
        state.get('manga.cache').clear();
        localStorage.clear();
        this.showToast('Cache cleared', 'success');
    }

    exportData() {
        const data = {
            bookmarks: Array.from(state.get('manga.bookmarked')),
            history: state.get('manga.history'),
            preferences: state.get('user.preferences'),
            timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mangaverse-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported', 'success');
    }

    async prefetchMangaData(mangaId) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.getMangaDetail(mangaId);
                this.getChapters(mangaId);
            });
        }
    }

    async prefetchNextChapter() {
        const current = state.get('reader.currentChapter');
        if (current) {
            const [mangaId, chapterNum] = current.split('-');
            const nextChapter = parseInt(chapterNum) + 1;
            
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    this.getChapterPages(mangaId, nextChapter);
                });
            }
        }
    }

    async prefetchNextPage(pageNum) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.getMangaList(pageNum);
            });
        }
    }

    warmupCache() {
        // Prefetch first page
        this.getMangaList(1);
        
        // Prefetch popular items based on history
        const history = state.get('manga.history');
        if (history.length) {
            const recent = history[0];
            this.getMangaDetail(recent.id);
            this.getChapters(recent.id);
        }
    }

    pauseBackgroundTasks() {
        // Cancel any pending requests
        api.abortAllRequests();
    }

    resumeBackgroundTasks() {
        // Resume normal operations
    }

    normalizeMangaList(data) {
        // Transform API data to consistent format
        if (data.data) {
            return data.data.map(item => ({
                id: item.id,
                title: item.attributes?.title?.en || 'Unknown Title',
                cover: this.getCoverUrl(item),
                rating: item.attributes?.rating?.average,
                status: item.attributes?.status,
                chapters: item.attributes?.chapterCount
            }));
        }
        
        return [];
    }

    normalizeMangaDetail(data) {
        return {
            id: data.id,
            title: data.attributes?.title?.en || 'Unknown Title',
            cover: this.getCoverUrl(data),
            description: data.attributes?.description?.en || 'No description available.',
            status: data.attributes?.status,
            genres: data.attributes?.tags?.map(tag => tag.attributes?.name?.en) || [],
            rating: data.attributes?.rating?.average,
            views: data.attributes?.views || 0
        };
    }

    normalizeChapters(data) {
        if (data.data) {
            return data.data.map(item => ({
                id: item.id,
                number: item.attributes?.chapter,
                title: item.attributes?.title,
                views: item.attributes?.views,
                date: item.attributes?.publishAt,
                isRead: this.isChapterRead(item.id)
            }));
        }
        
        return [];
    }

    normalizePages(data) {
        if (data.chapter?.data) {
            return data.chapter.data.map(filename => 
                `${data.baseUrl}/data/${data.chapter.hash}/${filename}`
            );
        }
        
        return [];
    }

    getCoverUrl(item) {
        const coverArt = item.relationships?.find(rel => rel.type === 'cover_art');
        if (coverArt && coverArt.attributes?.fileName) {
            return `https://uploads.mangadex.org/covers/${item.id}/${coverArt.attributes.fileName}`;
        }
        
        return 'https://via.placeholder.com/200x300/1a1a1a/666666?text=No+Cover';
    }

    isChapterRead(chapterId) {
        const progress = state.get('reader.progress');
        return progress[chapterId]?.completed || false;
    }

    getRecommendations(manga) {
        // Simple recommendation based on genres
        const allManga = Array.from(state.get('manga.cache').values())
            .filter(entry => entry.value?.length)
            .flatMap(entry => entry.value);
        
        return allManga
            .filter(m => m.id !== manga.id && m.genres?.some(g => manga.genres?.includes(g)))
            .slice(0, 5);
    }

    updateMetaTags() {
        // Update meta tags for SEO
        let title = 'Mangaverse - Read Manga Online';
        let description = 'Read the latest manga chapters online for free. High-quality scans, smooth reading experience.';
        
        if (this.currentRoute === 'manga' && this.currentParams.id) {
            // Could set manga-specific meta tags
        }
        
        document.title = title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }

    trackPageView() {
        if (CONFIG.features.analytics) {
            // Track page view (could send to analytics)
            console.debug('Page view:', this.currentRoute, this.currentParams);
        }
    }

    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        if (container) {
            if (results.length) {
                container.innerHTML = results.map(manga => Components.MangaCard(manga)).join('');
            } else {
                container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No results found</div>';
            }
        }
    }
}

class PerformanceMonitor {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.metrics = {};
    }

    start() {
        this.trackFPS();
        this.trackMemory();
        this.trackNetwork();
    }

    trackFPS() {
        const measure = () => {
            this.frames++;
            const now = performance.now();
            const delta = now - this.lastTime;
            
            if (delta >= 1000) {
                this.fps = Math.round((this.frames * 1000) / delta);
                this.frames = 0;
                this.lastTime = now;
            }
            
            requestAnimationFrame(measure);
        };
        
        requestAnimationFrame(measure);
    }

    trackMemory() {
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memory = performance.memory;
            }, 5000);
        }
    }

    trackNetwork() {
        if ('connection' in navigator) {
            this.metrics.network = {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            };
        }
    }

    getMetrics() {
        return {
            fps: this.fps,
            ...this.metrics
        };
    }
}

// Initialize app
const app = new MangaverseApp();
export default app;