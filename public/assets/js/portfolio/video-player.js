(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QZVideo = factory();
})(globalThis, function () {
  // Owns stream lifetimes; callers supply the player library and CDN boundary.
  function createPlayer({ Hls, cdn }) {
    const streams = new Map();
    const milestones = new WeakMap();

    function detach(element) {
      const stream = streams.get(element);
      if (!stream) return;
      if (stream.hls) stream.hls.destroy();
      else { element.removeAttribute('src'); element.load(); }
      streams.delete(element);
      milestones.delete(element);
    }

    function attach(element, id, { lazy = false } = {}) {
      if (!element || streams.get(element)?.id === id) return;
      detach(element);
      const url = cdn + '/' + id + '/playlist.m3u8';
      const stream = { id, started: !lazy, hls: null };
      // Prefer hls.js: the mixed-codec ladder needs its MSE codec switching.
      if (Hls && Hls.isSupported()) {
        stream.hls = new Hls({ autoStartLoad: !lazy });
        stream.hls.loadSource(url);
        stream.hls.attachMedia(element);
      } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
        element.src = url;
      }
      streams.set(element, stream);
    }

    function play(element) {
      if (!element) return;
      const stream = streams.get(element);
      if (stream && !stream.started) { stream.hls?.startLoad(); stream.started = true; }
      return element.play().catch(() => {});
    }

    function track(element, title, emit, ended = false) {
      if (!emit || (!ended && !element.duration)) return;
      const seen = milestones.get(element) || new Set();
      milestones.set(element, seen);
      const percent = ended ? 100 : element.currentTime / element.duration * 100;
      for (const mark of [25, 50, 75, 100]) {
        if (mark > percent || (mark === 100 && !ended) || seen.has(mark)) continue;
        seen.add(mark);
        emit('video_progresso', { video_titolo: title, percentuale: mark });
      }
    }

    return {
      attach, detach, play, track,
      pause: element => element?.pause(),
      dispose() { for (const element of streams.keys()) detach(element); },
    };
  }
  return { createPlayer };
});
