const Components = (function() {
    function renderMangaCard(manga) {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.setAttribute('data-id', manga.id);
        
        const imageUrl = manga.image || 'https://via.placeholder.com/200x300?text=No+Image';
        
        card.innerHTML = `
            <div class="relative">
                <img src="${imageUrl}" 
                    alt="${manga.title}"
                    loading="lazy"
                    onerror="this.src='https://via.placeholder.com/200x300?text=Error'">
                <div class="absolute top-2 right-2 bg-neon/20 backdrop-blur-sm px-2 py-1 rounded text-xs">
                    ${manga.chapters || 0} ch
                </div>
            </div>
            <div class="manga-info">
                <h3 class="manga-title">${manga.title}</h3>
                <div class="manga-meta">
                    <span class="rating">★ ${manga.rating || 'N/A'}</span>
                    <span class="trending ${manga.trending > 7 ? 'text-neon' : ''}">
                        ${manga.trending ? '🔥' + Math.round(manga.trending) : ''}
                    </span>
                </div>
            </div>
        `;
        
        return card;
    }
    
    function renderSkeletonCard() {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        return skeleton;
    }
    
    function renderSkeletonGrid(count = CONFIG.UI.SKELETON_COUNT) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(renderSkeletonCard());
        }
        return fragment;
    }
    
    function renderChapterList(chapters) {
        const container = document.createElement('div');
        container.className = 'chapter-list';
        
        chapters.sort((a, b) => b.number - a.number).forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <span>Chapter ${chapter.number}: ${chapter.title}</span>
                    <span class="text-xs text-gray-400">${chapter.date}</span>
                </div>
            `;
            container.appendChild(item);
        });
        
        return container;
    }
    
    function renderHeroSection(manga) {
        const section = document.createElement('section');
        section.className = 'hero-section mb-12 relative h-96 rounded-xl overflow-hidden';
        
        section.innerHTML = `
            <div class="absolute inset-0">
                <img src="${manga.image}" alt="${manga.title}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-dark via-dark/50 to-transparent"></div>
            </div>
            <div class="absolute bottom-0 left-0 p-8">
                <h2 class="text-4xl font-bold mb-2">${manga.title}</h2>
                <p class="text-gray-300 mb-4 max-w-2xl">${manga.description || ''}</p>
                <div class="flex space-x-4">
                    <button class="bg-neon text-dark px-6 py-2 rounded-lg font-semibold hover:shadow-neon transition">
                        Read Now
                    </button>
                    <button class="border border-neon text-neon px-6 py-2 rounded-lg font-semibold hover:bg-neon/10 transition">
                        Add to Library
                    </button>
                </div>
            </div>
        `;
        
        return section;
    }
    
    function updateGrid(container, mangaList) {
        const fragment = document.createDocumentFragment();
        mangaList.forEach(manga => {
            fragment.appendChild(renderMangaCard(manga));
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    // Intersection Observer for lazy loading
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    function observeImages(container) {
        container.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    return {
        renderMangaCard,
        renderSkeletonCard,
        renderSkeletonGrid,
        renderChapterList,
        renderHeroSection,
        updateGrid,
        observeImages
    };
})();

window.Components = Components;