/**
 * Plays a fragmented MP4 in stretches, so a visitor who scrolls past the video downloads only
 * its first few seconds.
 *
 * The file and its index (byte ranges per stretch) come from promo-kit/export_promo.py. Through
 * Media Source the first stretch is fetched and played; the rest is fetched only once playback
 * passes `warmup` seconds, or the visitor seeks past what is loaded.
 *
 * Without Media Source (iPhones before iOS 17.1), or if anything in that path fails, the video
 * falls back to playing the same file directly; it is a valid MP4 on its own, just without the
 * staged loading.
 */

const fetchRange = async (url, [first, last], signal) => {
  const res = await fetch(url, { headers: { Range: `bytes=${first}-${last}` }, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // 200 instead of 206: the server ignored Range and sent the whole file.
  return { bytes: await res.arrayBuffer(), whole: res.status === 200 };
};

const loadedUntil = (video) => {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime + 0.25 && currentTime <= buffered.end(i)) return buffered.end(i);
  }
  return 0;
};

/**
 * Starts loading into `video`; call once, when the video should begin playing.
 * Returns a cleanup function. `index` may be null (index failed to load): plain playback.
 */
export function playProgressively(video, { src, index, warmup = 5 }) {
  const MediaSourceImpl = window.ManagedMediaSource || window.MediaSource;
  const controller = new AbortController();
  const { signal } = controller;
  let objectUrl = null;
  const listeners = [];
  const on = (type, fn) => { video.addEventListener(type, fn); listeners.push([type, fn]); };

  const cleanup = () => {
    controller.abort();
    listeners.forEach(([type, fn]) => video.removeEventListener(type, fn));
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };

  const plain = () => {
    if (signal.aborted) return;
    const resumeAt = video.currentTime;
    const wasPlaying = !video.paused;
    listeners.forEach(([type, fn]) => video.removeEventListener(type, fn));
    video.src = src;
    if (resumeAt) video.currentTime = resumeAt;
    if (wasPlaying) video.play().catch(() => {});
  };

  if (!index || !MediaSourceImpl?.isTypeSupported?.(index.mime)) {
    plain();
    return cleanup;
  }

  const mediaSource = new MediaSourceImpl();
  // Safari's ManagedMediaSource only streams to a video with AirPlay off.
  if (MediaSourceImpl === window.ManagedMediaSource) video.disableRemotePlayback = true;
  objectUrl = URL.createObjectURL(mediaSource);
  video.src = objectUrl;

  mediaSource.addEventListener('sourceopen', async () => {
    try {
      const buffer = mediaSource.addSourceBuffer(index.mime);
      mediaSource.duration = index.duration;
      const append = (bytes) => new Promise((resolve, reject) => {
        buffer.addEventListener('updateend', resolve, { once: true });
        buffer.addEventListener('error', reject, { once: true });
        buffer.appendBuffer(bytes);
      });
      const finish = () => { if (mediaSource.readyState === 'open' && !buffer.updating) mediaSource.endOfStream(); };

      const [head, ...rest] = index.chunks;
      const first = await fetchRange(src, head, signal);
      await append(first.bytes);
      if (first.whole || !rest.length) { finish(); return; }

      let started = false;
      const loadRest = async () => {
        if (started) return;
        started = true;
        try {
          for (const range of rest) {
            const part = await fetchRange(src, range, signal);
            await append(part.bytes);
          }
          finish();
        } catch (err) {
          if (!signal.aborted) { console.warn('[promo video] staged load failed, playing directly', err); plain(); }
        }
      };
      on('timeupdate', () => { if (video.currentTime >= warmup) loadRest(); });
      on('seeking', () => { if (!loadedUntil(video)) loadRest(); });
    } catch (err) {
      if (!signal.aborted) { console.warn('[promo video] staged load failed, playing directly', err); plain(); }
    }
  }, { once: true });

  return cleanup;
}
