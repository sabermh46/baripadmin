import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Bell, House, Users } from 'lucide-react';
import { heroVilla1280, heroVilla720 } from '../../assets';
import HeroVideo from './HeroVideo';

/**
 * The hero's picture: a villa in its garden as the backdrop, the promo video standing in front
 * of it where an app screen would be, and four feature cards floating around them.
 *
 * The villa's edges fade out to transparent, so it sits on whatever the hero's background is.
 * Two sizes (720 / 1280 px wide) keep the phone download near 50 KB. It is the largest thing
 * above the fold, so it loads eagerly and first.
 *
 * The cards are positioned against what they point at: the upper two against the villa, the
 * lower two against the video. They are hidden on a
 * phone, where they would cover the video.
 */

const Card = ({ icon: Icon, tone, label, className = '', float = 'animate-float' }) => (
  <div aria-hidden
    className={`absolute z-20 hidden sm:flex items-center gap-2.5 rounded-2xl bg-white/90 py-2.5 pl-2.5 pr-4 shadow-xl shadow-secondary-900/10 ring-1 ring-white backdrop-blur-md ${float} ${className}`}>
    <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
      <Icon className="w-5 h-5" />
    </span>
    <span className="whitespace-pre-line text-sm font-medium leading-tight text-ink">{label}</span>
  </div>
);

const HeroArt = ({ videoRef, soundLabel }) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* On a wide screen the villa is wider than its column: it reaches back behind the gap
          and out past the right edge, where its faded sides melt into the page (the hero clips
          the overflow). The headline column sits above it. */}
      <div className="relative lg:w-[126%] lg:-ml-[16%]">
        <img
          src={heroVilla1280}
          srcSet={`${heroVilla720} 720w, ${heroVilla1280} 1280w`}
          sizes="(min-width: 1024px) 70vw, 100vw"
          width={1280} height={720}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="block w-full h-auto select-none pointer-events-none"
        />

        {/* The two upper cards, placed on the villa. */}
        <Card icon={House} tone="bg-sky-100 text-sky-600" label={t('landing_hero_chip_rent')}
          className="left-[3%] lg:left-[16%] top-[24%]" />
        <Card icon={BarChart3} tone="bg-violet-100 text-violet-600" label={t('landing_hero_chip_reports')}
          className="right-0 lg:right-[7%] top-[5%]" float="animate-float-delayed" />
      </div>

      {/* The video stands on the villa's lower half, like the app screen in front of the house. */}
      <div className="relative z-10 mx-auto w-full -mt-[20%] sm:mx-0 sm:ml-auto sm:w-[80%] sm:-mt-[27%] lg:w-[90%] lg:-mt-[31%]">
        <HeroVideo ref={videoRef} soundLabel={soundLabel} />
        <Card icon={Bell} tone="bg-emerald-100 text-emerald-600" label={t('landing_hero_chip_reminders')}
          className="right-full -mr-8 top-[38%]" float="animate-float-delayed" />
        {/* Across the bottom edge, between the video's pause button (bottom left) and its
            sound button (bottom right), so it never covers either. */}
        <Card icon={Users} tone="bg-primary-100 text-primary-600" label={t('landing_hero_chip_staff')}
          className="right-[40%] -bottom-9" />
      </div>
    </div>
  );
};

export default HeroArt;
