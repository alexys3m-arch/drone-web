(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QZLikes = factory();
})(globalThis, function () {
  function createClient({ request, storage }) {
    const entries = new Map();

    function entry(id) {
      if (!entries.has(id)) {
        let liked = false;
        try { liked = storage?.getItem('like:' + id) === '1'; } catch (_) {}
        entries.set(id, { state: { count: null, liked, loading: true, pending: false, error: '' }, listeners: new Set(), load: null });
      }
      return entries.get(id);
    }

    function update(id, change) {
      const item = entry(id);
      item.state = { ...item.state, ...change };
      item.listeners.forEach(listener => listener(item.state));
      return item.state;
    }

    async function responseCount(response) {
      if (!response.ok) throw new Error('Like request failed');
      const data = await response.json();
      if (!Number.isFinite(data.count) || data.count < 0) throw new Error('Invalid like count');
      return data.count;
    }

    function load(id) {
      const item = entry(id);
      if (item.load) return item.load;
      item.load = (async () => {
        try {
          const count = await responseCount(await request('/api/like?id=' + encodeURIComponent(id)));
          return update(id, { count, loading: false });
        } catch (_) {
          return update(id, { loading: false, error: 'Conteggio non disponibile.' });
        }
      })();
      return item.load;
    }

    async function toggle(id) {
      const previous = entry(id).state;
      if (previous.pending || previous.loading) return previous;
      const liked = !previous.liked;
      update(id, { liked, count: previous.count === null ? null : Math.max(0, previous.count + (liked ? 1 : -1)), pending: true, error: '' });
      try {
        const count = await responseCount(await request('/api/like', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, liked }),
        }));
        try { storage?.setItem('like:' + id, liked ? '1' : '0'); } catch (_) {}
        return update(id, { count, pending: false });
      } catch (_) {
        return update(id, { ...previous, pending: false, error: 'Non salvato. Riprova.' });
      }
    }

    return {
      get: id => entry(id).state, load, toggle,
      subscribe(id, listener) { const listeners = entry(id).listeners; listeners.add(listener); return () => listeners.delete(listener); },
    };
  }
  return { createClient };
});
