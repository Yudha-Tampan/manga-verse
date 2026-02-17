const State = (function() {
    let state = {
        currentView: 'home',
        manga: new Map(),
        chapters: new Map(),
        cache: new Map(),
        requests: new Map(),
        sourceHealth: new Map(),
        viewState: {
            scrollPosition: 0,
            filters: {},
            searchQuery: ''
        },
        preferences: {
            readingMode: 'vertical',
            theme: 'dark'
        }
    };
    
    const listeners = new Map();
    
    function setState(key, value) {
        if (typeof key === 'object') {
            Object.assign(state, key);
        } else {
            state[key] = value;
        }
        notifyListeners(key);
    }
    
    function getState(key) {
        return key ? state[key] : state;
    }
    
    function subscribe(key, callback) {
        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);
        return () => unsubscribe(key, callback);
    }
    
    function unsubscribe(key, callback) {
        if (listeners.has(key)) {
            listeners.get(key).delete(callback);
        }
    }
    
    function notifyListeners(key) {
        if (listeners.has(key)) {
            listeners.get(key).forEach(callback => callback(state[key]));
        }
    }
    
    function cleanup() {
        const now = Date.now();
        for (const [key, value] of state.cache) {
            if (value.expiry < now) {
                state.cache.delete(key);
            }
        }
        
        for (const [key, request] of state.requests) {
            if (request.abortController) {
                request.abortController.abort();
            }
        }
        state.requests.clear();
    }
    
    // Periodic cleanup
    setInterval(cleanup, 60000);
    
    return {
        setState,
        getState,
        subscribe
    };
})();

window.State = State;