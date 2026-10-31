import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { playProgressively } from './progressiveVideo';

/**
 * The one-minute promo, set into the page rather than dropped on it.
 *
 * - The section is the brand's deep teal, a shade under the video's own, so the video reads as a
 *   lit panel of the same material. (Matching the video's teal exactly was tried and dropped:
 *   browsers decode video colour a few shades apart from CSS and from each other, and on a large
 *   flat area that shows as a box.)
 * - Behind the video, a blurred copy of the current frame glows out into the section and follows
 *   whatever is on screen (white cards, the orange highlights), like an ambient-light TV.
 * - It loads nothing until the section is near the screen, then only the first 10 seconds; the
 *   rest is fetched once the visitor has actually watched 5 (see progressiveVideo.js).
 * - It plays muted when it comes into view and pauses when it leaves, unless the visitor prefers
 *   reduced motion or has Data Saver on — then it waits for a tap.
 *
 * The words around it come from the landing CMS (`promo_video`); the chapters are tied to the
 * video's own timing, so they live here with it.
 */

const BASE = `${import.meta.env.BASE_URL}media/promo/`;
const SRC = `${BASE}promo.mp4`;
const INDEX = `${BASE}promo.json`;
const POSTER = `${BASE}poster.jpg`;

// Where each part of the video starts, in seconds. Re-time these whenever the video is replaced.
const CHAPTERS = [
  { t: 0, label: 'শুরু' },
  { t: 12.4, label: 'ড্যাশবোর্ড' },
  { t: 20.2, label: 'ভাড়ার রশিদ' },
  { t: 24.0, label: 'রিমাইন্ডার' },
  { t: 28.8, label: 'অটো রিসিট' },
  { t: 37.0, label: 'ভাড়াটিয়া ও লোন' },
  { t: 46.3, label: 'খরচের হিসাব' },
  { t: 50.7, label: 'সব এক জায়গায়' },
];
const DURATION = 60;

const chapterAt = (time) => CHAPTERS.reduce((found, c, i) => (time >= c.t ? i : found), 0);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const canAutoplay = () =>
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && navigator.connection?.saveData !== true;

const PromoVideo = ({ data = {} }) => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  const stripRef = useRef(null);
  const chipRefs = useRef([]);
  const indexRef = useRef(undefined); // undefined: not asked yet; null: unavailable
  const indexPromiseRef = useRef(null);
  const detachRef = useRef(null);
  const userPausedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [loadedEnd, setLoadedEnd] = useState(0);
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

  useEffect(() => () => detachRef.current?.(), []);

  // Near the screen: fetch the (tiny) index. Mostly in view: play muted. Out of view: pause.
  useEffect(() => {
    const section = sectionRef.current;
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
    near.observe(section);
    view.observe(video);
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

  const active = chapterAt(time);

  // Keep the active chapter chip in view on a phone, scrolling the strip only.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = chipRefs.current[active];
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const video = () => videoRef.current;

  const togglePlay = () => {
    const v = video();
    if (v.paused || v.ended) { if (v.ended) v.currentTime = 0; play(); }
    else { userPausedRef.current = true; v.pause(); }
  };

  const toggleSound = () => {
    const v = video();
    v.muted = !v.muted;
    if (!v.muted && (v.paused || v.ended)) { if (v.ended) v.currentTime = 0; play(); }
  };

  const seek = (t) => {
    const v = video();
    attach();
    v.currentTime = t;
    if (v.paused) play();
  };

  // Tapping the picture: first tap brings the sound in (that is what a muted autoplay is asking
  // for), after that it pauses and plays.
  const onSurfaceClick = () => {
    const v = video();
    if (v.muted && !v.paused) { toggleSound(); return; }
    togglePlay();
  };

  const onProgress = () => {
    const v = video();
    const { buffered } = v;
    setLoadedEnd(buffered.length ? buffered.end(buffered.length - 1) : 0);
  };

  // Stay up while muted too: the bar carries the "watch with sound" pill.
  const showControls = !playing || ended || muted;

  return (
    <section ref={sectionRef} id="video" className="relative overflow-hidden text-white bg-linear-to-b from-secondary-900 via-secondary-800 to-secondary-900">
      {/* The video's own translucent circles, continued past its frame. */}
      <div aria-hidden className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
      <div aria-hidden className="absolute -bottom-40 -right-24 w-120 h-120 rounded-full bg-white/5" />

      {/* min-w-0 on the columns: a grid item will not shrink below its content by default, and
          the video's content is 960px wide, which pushed the page sideways on a phone. */}
      <div className="relative max-w-7xl mx-auto px-5 py-14 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="min-w-0 lg:col-span-4 text-center lg:text-left">
          {data.badge && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary" aria-hidden />
              {data.badge}
            </span>
          )}
          <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold leading-tight">{data.title}</h2>
          {data.subtitle && <p className="mt-3 sm:mt-4 text-white/80 sm:text-lg leading-relaxed">{data.subtitle}</p>}

          {/* Chapters, as a list beside the video on a wide screen. */}
          <ol className="hidden lg:block mt-8 space-y-1">
            {CHAPTERS.map((c, i) => {
              const next = CHAPTERS[i + 1]?.t ?? DURATION;
              const within = i === active ? Math.min(1, Math.max(0, (time - c.t) / (next - c.t))) : i < active ? 1 : 0;
              return (
                <li key={c.t}>
                  <button type="button" onClick={() => seek(c.t)}
                    className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === active && started ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="relative h-8 w-1 shrink-0 rounded-full bg-white/15 overflow-hidden" aria-hidden>
                      <span className="absolute inset-x-0 top-0 bg-primary rounded-full" style={{ height: `${within * 100}%` }} />
                    </span>
                    <span className={`flex-1 font-semibold ${i === active && started ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{c.label}</span>
                    <span className="text-xs tabular-nums text-white/50">{clock(c.t)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="relative">
            {/* Ambient glow: the current frame, tiny and blurred, spilling past the video's edges.
                The poster stands in until the first frame is drawn. */}
            <div aria-hidden className="absolute -inset-6 sm:-inset-10 opacity-60 pointer-events-none"
              style={{ backgroundImage: `url(${POSTER})`, backgroundSize: 'cover', filter: 'blur(48px) saturate(1.4)' }}>
              <canvas ref={glowRef} width={32} height={24} className="w-full h-full" />
            </div>

            <div className="group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
              <video ref={videoRef} className="relative block w-full aspect-4/3 cursor-pointer"
                poster={POSTER} muted playsInline preload="none" aria-label={data.title || 'প্রোমো ভিডিও'}
                onClick={onSurfaceClick}
                onPlay={() => { setPlaying(true); setEnded(false); }}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setEnded(true); }}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                onProgress={onProgress} />

              {/* Waiting for a tap (reduced motion or Data Saver). */}
              {!started && !autoplay && (
                <button type="button" onClick={() => { video().muted = false; play(); }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10">
                  <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary shadow-2xl flex items-center justify-center">
                    <Play className="w-7 h-7 sm:w-9 sm:h-9 ml-1" fill="currentColor" aria-hidden />
                  </span>
                  <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-semibold">ভিডিও দেখুন · {clock(DURATION)}</span>
                </button>
              )}

              {ended && (
                <button type="button" onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white text-secondary-700 px-5 py-2.5 font-semibold shadow-2xl">
                    <RotateCcw className="w-4 h-4" aria-hidden /> আবার দেখুন
                  </span>
                </button>
              )}

              {/* Controls: always there while paused; while playing they wait for a hover on a
                  pointer device, and stay on a touch screen where there is no hover. */}
              {started && (
                <div className={`absolute inset-x-0 bottom-0 px-3 sm:px-4 pb-3 pt-10 bg-linear-to-t from-black/45 to-transparent transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100'
                }`}>
                  <div className="relative h-1.5 rounded-full bg-white/20">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${(loadedEnd / DURATION) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${(time / DURATION) * 100}%` }} />
                    {CHAPTERS.slice(1).map((c) => (
                      <span key={c.t} aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-white/70" style={{ left: `${(c.t / DURATION) * 100}%` }} />
                    ))}
                    <input type="range" min={0} max={DURATION} step={0.1} value={time}
                      onChange={(e) => seek(Number(e.target.value))}
                      aria-label="ভিডিওর অবস্থান" aria-valuetext={`${clock(time)} / ${clock(DURATION)}`}
                      className="absolute -inset-y-2 inset-x-0 w-full opacity-0 cursor-pointer" />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <button type="button" onClick={togglePlay} aria-label={playing ? 'থামান' : 'চালান'}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15">
                      {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
                    </button>
                    <span className="tabular-nums text-white/85">{clock(time)} / {clock(DURATION)}</span>
                    <span className="flex-1 truncate text-white/70">{CHAPTERS[active].label}</span>
                    {/* Muted, the sound button is the one thing worth asking for, so it grows into a
                        labelled pill. It lives in this bar rather than floating over the picture,
                        where it covered the video's own headlines. */}
                    {muted ? (
                      <button type="button" onClick={toggleSound}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary pl-2.5 pr-3 py-1.5 text-xs sm:text-sm font-semibold shadow-lg ring-4 ring-primary/25 hover:bg-primary-600 transition-colors">
                        <VolumeX className="w-4 h-4" aria-hidden />
                        {data.sound_label || 'শব্দসহ দেখুন'}
                      </button>
                    ) : (
                      <button type="button" onClick={toggleSound} aria-label="শব্দ বন্ধ করুন"
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chapters as a chip strip under the video on a phone or tablet. */}
          <div ref={stripRef} className="lg:hidden mt-5 -mx-5 px-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHAPTERS.map((c, i) => (
              <button key={c.t} ref={(el) => { chipRefs.current[i] = el; }} type="button" onClick={() => seek(c.t)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  i === active && started ? 'bg-primary text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoVideo;
