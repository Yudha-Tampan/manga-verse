// state.js - Global Reactive State Management
class StateManager {
  constructor() {
    this.state = {
      manga: {
        list: [],
        cache: new Map(),
        popular: [],
        recent: [],
        bookmarked: new Set(),
        history: []
      },
      reader: {
        currentManga: null,
        currentChapter: null,
        currentPage: 0,
        pages: [],
        readingMode: 'vertical',
        progress: {},
        brightness: 100,
        fontSize: 16,
        autoScroll: false
      },
      ui: {
        theme: 'dark',
        compact: false,
        amoled: false,
        sidebar: false,
        search: '',
        filters: {
          genres: [],
          status: [],
          sort: 'latest'
        }
      },
      user: {
        id: null,
        preferences: {},
        achievements: [],
        level: 1,
        streak: 0,
        lastRead: null
      },
      system: {
        online: navigator.onLine,
        memory: null,
        fps: 60,
        lastSync: Date.now(),
        errors: []
      }
    };
    
    this.observers = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.memoryManager = new MemoryManager();
    this.init();
  }
  
  init() {
    this.loadFromStorage();
    this.setupListeners();
    this.startMemoryMonitoring();
  }
  
  setupListeners() {
    window.addEventListener('online', () => this.updateSystem({ online: true }));
    window.addEventListener('offline', () => this.updateSystem({ online: false }));
    window.addEventListener('beforeunload', () => this.persistState());
  }
  
  // Reactive State Updates
  set(path, value) {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    const oldValue = current[keys[keys.length - 1]];
    current[keys[keys.length - 1]] = value;
    
    this.notify(path, value, oldValue);
    this.addToHistory(path, value, oldValue);
    this.persistState();
  }
  
  get(path) {
    const keys = path.split('.');
    let current = this.state;
    
    for (const key of keys) {
      if (current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }
  
  subscribe(path, callback) {
    if (!this.observers.has(path)) {
      this.observers.set(path, new Set());
    }
    this.observers.get(path).add(callback);
    
    return () => {
      this.observers.get(path)?.delete(callback);
    };
  }
  
  notify(path, value, oldValue) {
    this.observers.get(path)?.forEach(callback => {
      try {
        callback(value, oldValue);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }
  
  // Immutable Updates
  update(path, updater) {
    const current = this.get(path);
    const newValue = typeof updater === 'function' ? updater(current) : updater;
    this.set(path, newValue);
  }
  
  // History Management
  addToHistory(path, value, oldValue) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ path, value, oldValue, timestamp: Date.now() });
    this.historyIndex++;
    
    if (this.history.length > 100) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  undo() {
    if (this.historyIndex >= 0) {
      const entry = this.history[this.historyIndex];
      this.set(entry.path, entry.oldValue);
      this.historyIndex--;
    }
  }
  
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const entry = this.history[this.historyIndex];
      this.set(entry.path, entry.value);
    }
  }
  
  // Storage Persistence
  persistState() {
    try {
      const serialized = JSON.stringify({
        manga: {
          bookmarked: Array.from(this.state.manga.bookmarked),
          history: this.state.manga.history
        },
        user: this.state.user,
        reader: {
          progress: this.state.reader.progress,
          readingMode: this.state.reader.readingMode,
          fontSize: this.state.reader.fontSize,
          brightness: this.state.reader.brightness
        },
        ui: {
          theme: this.state.ui.theme,
          compact: this.state.ui.compact,
          amoled: this.state.ui.amoled
        }
      });
      
      localStorage.setItem('mangaverse_state', serialized);
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
  
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('mangaverse_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        this.state.manga.bookmarked = new Set(parsed.manga?.bookmarked || []);
        this.state.manga.history = parsed.manga?.history || [];
        this.state.user = { ...this.state.user, ...parsed.user };
        this.state.reader = { ...this.state.reader, ...parsed.reader };
        this.state.ui = { ...this.state.ui, ...parsed.ui };
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  // Memory Management
  startMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.updateSystem({
          memory: {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          }
        });
        
        if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
          this.triggerMemoryCleanup();
        }
      }, 10000);
    }
  }
  
  triggerMemoryCleanup() {
    this.memoryManager.cleanup();
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, entry] of this.state.manga.cache) {
      if (now - entry.timestamp > CONFIG.cache.ttl.mangaList) {
        this.state.manga.cache.delete(key);
      }
    }
  }
  
  // Utility Methods
  updateSystem(updates) {
    this.state.system = { ...this.state.system, ...updates };
  }
  
  addError(error) {
    this.state.system.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
    
    if (this.state.system.errors.length > 50) {
      this.state.system.errors.shift();
    }
  }
  
  clearErrors() {
    this.state.system.errors = [];
  }
}

class MemoryManager {
  cleanup() {
    if (window.gc) {
      window.gc();
    }
  }
}

export const state = new StateManager();
export default state;