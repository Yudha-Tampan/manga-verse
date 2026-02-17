// components.js - Pure Function UI Components
export const Components = {
    // Manga Card Component
    MangaCard: (manga, index) => {
        const coverUrl = manga.cover || 'https://via.placeholder.com/200x300/1a1a1a/666666?text=No+Cover';
        
        return `
            <div class="manga-card cursor-pointer" data-manga-id="${manga.id}" data-index="${index}">
                <div class="relative aspect-[2/3] overflow-hidden rounded-xl">
                    <img 
                        src="${coverUrl}" 
                        alt="${manga.title}"
                        class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        loading="lazy"
                        onload="this.classList.add('loaded')"
                        onerror="this.src='https://via.placeholder.com/200x300/1a1a1a/666666?text=Error'"
                    >
                    <div class="absolute top-2 right-2">
                        ${manga.rating ? `
                            <span class="glass px-2 py-1 rounded-full text-xs font-semibold">
                                ⭐ ${manga.rating}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="mt-2 space-y-1">
                    <h3 class="font-semibold text-sm line-clamp-2">${manga.title}</h3>
                    <div class="flex items-center justify-between text-xs text-gray-400">
                        <span>${manga.chapters || '?'} ch</span>
                        ${manga.status ? `
                            <span class="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
                                ${manga.status}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // Skeleton Card (for progressive rendering)
    SkeletonCard: () => `
        <div class="animate-pulse">
            <div class="aspect-[2/3] rounded-xl skeleton-card"></div>
            <div class="mt-2 space-y-2">
                <div class="h-3 skeleton-text w-3/4"></div>
                <div class="h-2 skeleton-text w-1/2"></div>
            </div>
        </div>
    `,

    // Chapter List Component
    ChapterList: (chapters, mangaId) => {
        if (!chapters?.length) {
            return '<div class="text-center py-8 text-gray-400">No chapters available</div>';
        }

        return `
            <div class="space-y-1">
                ${chapters.map((chapter, index) => `
                    <div 
                        class="chapter-item flex items-center justify-between cursor-pointer hover:glass rounded-lg transition-all"
                        data-chapter-id="${chapter.id}"
                        data-manga-id="${mangaId}"
                        data-index="${index}"
                    >
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium truncate">
                                ${chapter.title || `Chapter ${chapter.number}`}
                            </h4>
                            <div class="flex items-center text-xs text-gray-400 mt-1">
                                <span>${chapter.views || 0} views</span>
                                <span class="mx-2">•</span>
                                <span>${new Date(chapter.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3 ml-4">
                            ${chapter.isRead ? `
                                <span class="text-xs text-green-400">✓ Read</span>
                            ` : ''}
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Reader View Component
    ReaderView: (pages, currentPage, mode = 'vertical') => {
        if (!pages?.length) {
            return '<div class="text-center py-8 text-gray-400">No pages available</div>';
        }

        return `
            <div class="reader-container ${mode === 'horizontal' ? 'flex overflow-x-auto snap-x snap-mandatory' : ''}" 
                 data-reader-mode="${mode}">
                ${pages.map((page, index) => `
                    <div class="${mode === 'vertical' ? 'mb-4' : 'snap-start shrink-0 w-full flex justify-center'}"
                         data-page-index="${index}">
                        <img 
                            src="${page}" 
                            alt="Page ${index + 1}"
                            class="reader-image max-w-full h-auto"
                            loading="${index < 3 ? 'eager' : 'lazy'}"
                            onload="this.classList.add('loaded')"
                            onerror="this.src='https://via.placeholder.com/800x1200/1a1a1a/666666?text=Failed+to+load'"
                        >
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Navbar Component
    Navbar: (activeRoute = 'home') => {
        const links = [
            { route: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { route: 'library', label: 'Library', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
            { route: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { route: 'bookmarks', label: 'Bookmarks', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
            { route: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        ];

        return `
            <nav class="fixed top-0 left-0 right-0 glass z-40">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="flex items-center justify-between h-16">
                        <div class="flex items-center space-x-2">
                            <span class="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                MANGAVERSE
                            </span>
                        </div>

                        <div class="hidden md:flex items-center space-x-1">
                            ${links.map(link => `
                                <a href="#/${link.route}" 
                                   class="nav-link ${activeRoute === link.route ? 'active' : ''}"
                                   data-route="${link.route}">
                                    ${link.label}
                                </a>
                            `).join('')}
                        </div>

                        <div class="flex items-center space-x-4">
                            <button class="p-2 hover:glass rounded-lg transition-colors" data-action="search">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </button>
                            
                            <button class="p-2 hover:glass rounded-lg transition-colors" data-action="settings">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    },

    // Search Bar Component
    SearchBar: (query = '') => `
        <div class="relative">
            <input 
                type="text"
                value="${query}"
                placeholder="Search manga..."
                class="w-full glass border-0 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                data-search-input
            >
            <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
        </div>
    `,

    // Genre Filter Component
    GenreFilter: (selectedGenres = []) => {
        const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'];
        
        return `
            <div class="flex flex-wrap gap-2">
                ${genres.map(genre => `
                    <button 
                        class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                               ${selectedGenres.includes(genre) 
                                   ? 'bg-blue-500 text-white' 
                                   : 'glass hover:bg-white/10'}"
                        data-genre="${genre}"
                    >
                        ${genre}
                    </button>
                `).join('')}
            </div>
        `;
    },

    // Toast Component
    Toast: (message, type = 'info') => {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        return `
            <div class="toast flex items-center space-x-2" data-toast>
                <span class="text-lg">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
    },

    // Modal Component
    Modal: (title, content, actions = []) => `
        <div class="modal-overlay" data-modal-overlay></div>
        <div class="modal" data-modal>
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="p-1 hover:glass rounded" data-modal-close>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="mb-6">${content}</div>
            ${actions.length ? `
                <div class="flex justify-end space-x-2">
                    ${actions.map(action => `
                        <button class="px-4 py-2 rounded-lg ${action.primary ? 'bg-blue-500 hover:bg-blue-600' : 'glass hover:bg-white/10'}"
                                data-modal-action="${action.id}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `,

    // Floating Action Button
    FloatingAction: (icon, action, label = '') => `
        <button class="fab group" data-fab="${action}">
            ${icon}
            ${label ? `
                <span class="absolute right-full mr-2 px-2 py-1 glass rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    ${label}
                </span>
            ` : ''}
        </button>
    `,

    // Progress Bar
    ProgressBar: (progress = 0) => `
        <div class="progress-bar" style="transform: scaleX(${progress});"></div>
    `,

    // Scroll Progress Tracker
    ScrollTracker: () => `
        <div class="fixed top-16 left-0 right-0 h-0.5 bg-gray-800 z-30">
            <div class="h-full bg-blue-500 transition-all duration-300" data-scroll-progress></div>
        </div>
    `,

    // History Panel
    HistoryPanel: (items = []) => {
        if (!items.length) {
            return '<div class="text-center py-8 text-gray-400">No reading history</div>';
        }

        return `
            <div class="space-y-2">
                ${items.map(item => `
                    <div class="flex items-center space-x-3 p-2 hover:glass rounded-lg cursor-pointer" data-manga-id="${item.id}">
                        <img src="${item.cover}" alt="${item.title}" class="w-12 h-16 object-cover rounded">
                        <div class="flex-1">
                            <h4 class="font-medium">${item.title}</h4>
                            <p class="text-xs text-gray-400">Chapter ${item.lastChapter} • ${new Date(item.lastRead).toLocaleDateString()}</p>
                        </div>
                        <button class="p-2" data-continue-reading="${item.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Bookmark Panel
    BookmarkPanel: (items = []) => {
        if (!items.length) {
            return '<div class="text-center py-8 text-gray-400">No bookmarks yet</div>';
        }

        return `
            <div class="grid grid-cols-2 gap-3">
                ${items.map(item => `
                    <div class="relative cursor-pointer" data-manga-id="${item.id}">
                        <div class="aspect-[2/3] rounded-lg overflow-hidden">
                            <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover">
                        </div>
                        <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent">
                            <h4 class="text-xs font-medium truncate">${item.title}</h4>
                        </div>
                        <button class="absolute top-2 right-2 p-1 glass rounded-full" data-remove-bookmark="${item.id}">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Recommendation Panel
    RecommendationPanel: (items = []) => `
        <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-400">Recommended for you</h3>
            <div class="flex overflow-x-auto space-x-3 pb-2">
                ${items.map(item => `
                    <div class="flex-none w-32 cursor-pointer" data-manga-id="${item.id}">
                        <div class="aspect-[2/3] rounded-lg overflow-hidden">
                            <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover">
                        </div>
                        <p class="text-xs mt-1 truncate">${item.title}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `,

    // Dev Panel (only visible in debug mode)
    DevPanel: (metrics = {}) => {
        if (!CONFIG.features.debugMode) return '';

        return `
            <div class="fixed bottom-4 left-4 glass p-4 rounded-lg text-xs z-50 hidden md:block">
                <div class="space-y-1">
                    <div class="text-green-400">FPS: ${metrics.fps || 60}</div>
                    <div class="text-blue-400">Memory: ${metrics.memory ? Math.round(metrics.memory.used / 1024 / 1024) : '?'}MB</div>
                    <div class="text-yellow-400">Requests: ${metrics.activeRequests || 0}</div>
                    <div class="text-purple-400">Cache: ${metrics.cacheSize || 0} items</div>
                </div>
            </div>
        `;
    },

    // Settings Panel
    SettingsPanel: (settings = {}) => `
        <div class="space-y-6">
            <div>
                <h4 class="text-sm font-medium mb-3">Appearance</h4>
                <div class="space-y-3">
                    <label class="flex items-center justify-between">
                        <span class="text-sm">AMOLED Mode</span>
                        <input type="checkbox" ${settings.amoled ? 'checked' : ''} data-setting="amoled">
                    </label>
                    <label class="flex items-center justify-between">
                        <span class="text-sm">Compact Mode</span>
                        <input type="checkbox" ${settings.compact ? 'checked' : ''} data-setting="compact">
                    </label>
                    <label class="flex items-center justify-between">
                        <span class="text-sm">Reduced Motion</span>
                        <input type="checkbox" ${settings.reducedMotion ? 'checked' : ''} data-setting="reducedMotion">
                    </label>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-medium mb-3">Reader Settings</h4>
                <div class="space-y-3">
                    <div>
                        <label class="text-sm">Reading Mode</label>
                        <select class="w-full mt-1 glass border-0 rounded-lg p-2" data-setting="readingMode">
                            <option value="vertical" ${settings.readingMode === 'vertical' ? 'selected' : ''}>Vertical</option>
                            <option value="horizontal" ${settings.readingMode === 'horizontal' ? 'selected' : ''}>Horizontal</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm">Font Size</label>
                        <input type="range" min="12" max="24" value="${settings.fontSize || 16}" class="w-full" data-setting="fontSize">
                    </div>
                    <div>
                        <label class="text-sm">Brightness</label>
                        <input type="range" min="50" max="150" value="${settings.brightness || 100}" class="w-full" data-setting="brightness">
                    </div>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-medium mb-3">Data & Storage</h4>
                <div class="space-y-2">
                    <button class="w-full glass hover:bg-white/10 p-2 rounded-lg text-sm" data-action="clearCache">
                        Clear Cache
                    </button>
                    <button class="w-full glass hover:bg-white/10 p-2 rounded-lg text-sm" data-action="exportData">
                        Export Data
                    </button>
                </div>
            </div>
        </div>
    `
};

export default Components;