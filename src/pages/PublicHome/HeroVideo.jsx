import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { playProgressively } from './progressiveVideo';

/**
 * The one-minute promo, as the hero's picture.
 *
 * - It loads nothing until it is near the screen, then only the first 10 seconds; the rest is
 *   fetched once the visitor has watched 5 (see progressiveVideo.js).
 * - It plays muted when it comes into view and pauses when it leaves, unless the visitor prefers
 *   reduced motion or has Data Saver on; then it waits for a tap.
 * - Behind it, a blurred copy of the current frame glows out onto the page and follows whatever
 *   is on screen, like an ambient-light TV.
 * - No timeline: the hero only asks for two things, sound and pause. `ref.playWithSound()` lets
 *   the hero's "watch the video" button start it from the beginning with sound.
 */

const BASE = `${import.meta.env.BASE_URL}media/promo/`;
const SRC = `${BASE}promo.mp4`;
const INDEX = `${BASE}promo.json`;
const POSTER = `${BASE}poster.jpg`;
const DURATION_LABEL = '1:00';

const canAutoplay = () =>
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && navigator.connection?.saveData !== true;

// Glass controls: legible over the video's white cards and its teal alike.
const GLASS = 'bg-black/40 text-white backdrop-blur-md ring-1 ring-white/15 hover:bg-black/55 transition-colors';

const HeroVideo = ({ soundLabel, ref }) => {
  const { t } = useTranslation();
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  const indexPromiseRef = useRef(null);
  const indexRef = useRef(undefined); // undefined: not asked yet; null: unavailable
  const detachRef = useRef(null);
  const userPausedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [autoplay] = useState(canAutoplay);

  const fetchIndex = () => {
    indexPromiseRef.current ??= fetch(INDEX)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((index) => { indexRef.current = index; return index; });
    return indexPromiseRef.current;
  };

  // Synchronous once the index is in, so a tap can attach and play inside the same gesture.
  const attach = () => {
    if (detachRef.current) return;
    detachRef.current = playProgressively(videoRef.current, { src: SRC, index: indexRef.current ?? null });
    setStarted(true);
  };

  const play = () => {
    attach();
    userPausedRef.current = false;
    videoRef.current.play().catch(() => {});
  };

  const playWithSound = () => {
    const video = videoRef.current;
    video.muted = false;
    if (video.ended || video.currentTime > 0.5) video.currentTime = 0;
    play();
    // On a phone the video can be a screen away from the button that asked for it.
    frameRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };

  useImperativeHandle(ref, () => ({ playWithSound }));

  useEffect(() => () => detachRef.current?.(), []);

  // Near the screen: fetch the (tiny) index. Mostly in view: play muted. Out of view: pause.
  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    const near = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { fetchIndex(); near.disconnect(); }
    }, { rootMargin: '400px 0px' });
    const view = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.35) {
        if (autoplay && !userPausedRef.current && !video.ended) fetchIndex().then(play);
      } else if (!video.paused) {
        video.pause();
      }
    }, { threshold: [0, 0.35] });
    near.observe(frame);
    view.observe(frame);
    return () => { near.disconnect(); view.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play/fetchIndex only touch refs
  }, [autoplay]);

  // The ambient glow: the current frame, drawn tiny and blurred behind the video.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = glowRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    let handle = 0;
    let last = 0;
    const paint = () => { try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { /* no frame yet */ } };
    const loop = (now) => {
      if (now - last > 120) { paint(); last = now; }
      handle = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
    };
    const stop = () => {
      if (video.cancelVideoFrameCallback && video.requestVideoFrameCallback) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
    const start = () => { stop(); handle = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };
    video.addEventListener('play', start);
    video.addEventListener('pause', stop);
    video.addEventListener('seeked', paint);
    video.addEventListener('loadeddata', paint);
    return () => {
      stop();
      video.removeEventListener('play', start);
      video.removeEventListener('pause', stop);
      video.removeEventListener('seeked', paint);
      video.removeEventListener('loadeddata', paint);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused || video.ended) { if (video.ended) video.currentTime = 0; play(); }
    else { userPausedRef.current = true; video.pause(); }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    if (!video.muted && (video.paused || video.ended)) { if (video.ended) video.currentTime = 0; play(); }
  };

  // Tapping the picture: the first tap brings the sound in (that is what a muted autoplay is
  // asking for); after that it pauses and plays.
  const onSurfaceClick = () => {
    const video = videoRef.current;
    if (video.muted && !video.paused) { toggleSound(); return; }
    togglePlay();
  };

  // While playing with sound on a device that can hover, the controls step back until hovered.
  // Paused, muted or on a touch screen (no hover to bring them back) they stay.
  const quiet = playing && !muted && !ended;

  return (
    <div ref={frameRef} className="relative">
      {/* Ambient glow. The poster stands in until the first frame is drawn. */}
      <div aria-hidden className="absolute -inset-4 sm:-inset-8 opacity-50 pointer-events-none"
        style={{ backgroundImage: `url(${POSTER})`, backgroundSize: 'cover', filter: 'blur(44px) saturate(1.3)' }}>
        <canvas ref={glowRef} width={32} height={24} className="w-full h-full" />
      </div>

      <div className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-secondary-800 shadow-2xl shadow-secondary-900/25 ring-1 ring-black/5">
        <video ref={videoRef} className="block w-full aspect-4/3 cursor-pointer"
          poster={POSTER} muted playsInline preload="none" aria-label={t('landing_video_label')}
          onClick={onSurfaceClick}
          onPlay={() => { setPlaying(true); setEnded(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setEnded(true); }}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)} />

        {/* Waiting for a tap (reduced motion or Data Saver). */}
        {!started && !autoplay && (
          <button type="button" onClick={playWithSound}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10">
            <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center">
              <Play className="w-7 h-7 sm:w-9 sm:h-9 ml-1" fill="currentColor" aria-hidden />
            </span>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${GLASS}`}>{t('landing_video_watch')} · {DURATION_LABEL}</span>
          </button>
        )}

        {ended && (
          <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="inline-flex items-center gap-2 rounded-full bg-white text-secondary-800 px-5 py-2.5 font-medium shadow-2xl">
              <RotateCcw className="w-4 h-4" aria-hidden /> {t('landing_video_replay')}
            </span>
          </button>
        )}

        {started && !ended && (
          <div className={`absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 flex items-center justify-between gap-3 transition-opacity duration-300 ${
            quiet ? '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100' : ''
          }`}>
            <button type="button" onClick={togglePlay} aria-label={playing ? t('landing_video_pause') : t('landing_video_play')}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${GLASS}`}>
              {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
            </button>
            {muted ? (
              <button type="button" onClick={toggleSound}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-white pl-3 pr-4 py-2 text-sm font-medium shadow-lg ring-4 ring-primary/25 hover:bg-primary-600 transition-colors">
                <VolumeX className="w-4 h-4" aria-hidden />
                {soundLabel || t('landing_video_unmute')}
              </button>
            ) : (
              <button type="button" onClick={toggleSound} aria-label={t('landing_video_mute')}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${GLASS}`}>
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroVideo;
