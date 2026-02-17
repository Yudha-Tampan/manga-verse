(function() {
    let currentPage = 1;
    let isLoading = false;
    let searchTimeout;
    
    // Initialize app
    document.addEventListener('DOMContentLoaded', async () => {
        initializeEventListeners();
        await loadInitialData();
        setupInfiniteScroll();
    });
    
    function initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                handleViewChange(e.target.dataset.view);
            });
        });
        
        // Search with debounce
        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 500);
        });
        
        // Card click delegation
        document.getElementById('content').addEventListener('click', (e) => {
            const card = e.target.closest('.manga-card');
            if (card) {
                const mangaId = card.dataset.id;
                showMangaDetails(mangaId);
            }
        });
    }
    
    async function loadInitialData() {
        const content = document.getElementById('content');
        
        // Show skeletons immediately
        content.appendChild(Components.renderSkeletonGrid());
        
        try {
            const data = await API.getMangaList();
            
            // Progressive render
            setTimeout(() => {
                Components.updateGrid(content, data);
                State.setState('manga', new Map(data.map(m => [m.id, m])));
            }, 100);
            
        } catch (error) {
            console.error('Failed to load manga:', error);
            showError('Failed to load manga. Please try again.');
        }
    }
    
    async function handleViewChange(view) {
        State.setState('currentView', view);
        currentPage = 1;
        
        const content = document.getElementById('content');
        content.innerHTML = '';
        content.appendChild(Components.renderSkeletonGrid());
        
        try {
            let data;
            switch(view) {
                case 'trending':
                    data = await API.getTrending();
                    break;
                case 'popular':
                    data = await API.getPopular();
                    break;
                case 'latest':
                    data = await API.getLatest();
                    break;
                default:
                    data = await API.getMangaList();
            }
            
            Components.updateGrid(content, data);
            
        } catch (error) {
            console.error(`Failed to load ${view}:`, error);
            showError(`Failed to load ${view} manga.`);
        }
    }
    
    async function handleSearch(query) {
        if (!query.trim()) {
            await loadInitialData();
            return;
        }
        
        const content = document.getElementById('content');
        content.innerHTML = '';
        content.appendChild(Components.renderSkeletonGrid());
        
        try {
            const data = await API.searchManga(query);
            Components.updateGrid(content, data);
            
        } catch (error) {
            console.error('Search failed:', error);
            showError('Search failed. Please try again.');
        }
    }
    
    async function showMangaDetails(mangaId) {
        const manga = State.getState('manga').get(mangaId);
        if (!manga) return;
        
        // Create modal or navigate to detail view
        console.log('Showing details for:', manga);
        
        // For now, just log. In production, render a detail modal
    }
    
    function setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading) {
                    loadMore();
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '100px'
        });
        
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        document.getElementById('content').after(sentinel);
        observer.observe(sentinel);
    }
    
    async function loadMore() {
        if (isLoading) return;
        
        isLoading = true;
        currentPage++;
        
        try {
            const data = await API.getMangaList(currentPage);
            
            if (data && data.length > 0) {
                const content = document.getElementById('content');
                data.forEach(manga => {
                    content.appendChild(Components.renderMangaCard(manga));
                });
            }
            
        } catch (error) {
            console.error('Failed to load more:', error);
        } finally {
            isLoading = false;
        }
    }
    
    function showError(message) {
        // Implement error toast
        console.error(message);
        
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
    
    // Periodic cache warmup
    setInterval(async () => {
        if (navigator.onLine) {
            try {
                await API.getTrending();
                await API.getPopular();
            } catch (error) {
                // Silently fail for warmup
            }
        }
    }, CONFIG.API.CACHE.WARMUP_INTERVAL);
    
    // Handle online/offline
    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
    });
    
    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
    });
})();