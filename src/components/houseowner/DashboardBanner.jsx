import React from 'react';
import { useTranslation } from 'react-i18next';
import { banner_big, banner_mobile } from '../../assets';

/**
 * The greeting band at the top of the owner dashboard.
 *
 * The artwork is decorative, so it is `alt=""` and aria-hidden: a screen reader announcing
 * "house illustration" here adds nothing the heading has not already said. It is also
 * absolutely positioned rather than a flex sibling, which is what lets the text block keep
 * the full row on a phone — at 320px there is no width to spare for a picture, and the
 * greeting is the part that carries meaning.
 *
 * Blue, not the app's orange. It is the one band on the page that is pure chrome — no
 * figure, no control, nothing to act on — and tinting it with the brand colour would put the
 * loudest thing on the screen somewhere with nothing to read. It also gives the four stat
 * cards below it their own accents to work with instead of competing with an orange field.
 */
const DashboardBanner = ({ name }) => {
  const { t, i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');

  return (
    // <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50 via-sky-50/70 to-sky-50 shadow-[inset_0_1px_0_0_#ffffffe6,0_1px_2px_-1px_#c77c0240,0_14px_30px_-16px_#c77c0240]">
    <section className="relative py-4 px-5 z-10 overflow-hidden rounded-2xl bg-[#EEF8FE] shadow-[inset_0_1px_0_0_#ffffffe6,0_1px_2px_-1px_#c77c0240,0_14px_30px_-16px_#c77c0240]">

        {/* <picture>, not a width check in JavaScript.
            The browser resolves the source before it downloads anything, so only one file is
            ever fetched. Reading window.innerWidth would mean rendering the mobile art first,
            then swapping — a second download and a visible change on a banner that is eager
            precisely because it must not pop in — and it would need a resize listener to
            survive a rotation.

            `contents` on the wrapper so the <picture> generates no box of its own: the <img>
            is absolutely positioned against the section, and an inline wrapper would still
            contribute a line box above the greeting. */}
        <picture className="contents">
          <source media="(min-width: 451px)" srcSet={banner_big} />
          <img
            src={banner_mobile}
            alt=""
            aria-hidden="true"
            // Eager, not lazy: this is above the fold on every visit, and a lazy decode here is
            // a visible pop-in on the first paint of the page.
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute h-full right-0 top-0 w-auto select-none object-cover object-bottom-right -z-10"
          />
        </picture>
        <p className="text-xs text-slate-500 sm:text-sm">{t('welcome_back')},</p>
        <h1
          title={name}
          className={`mt-0.5 truncate text-lg font-bold text-slate-900 sm:text-2xl ${
            isBengali ? 'font-hind-siliguri' : 'font-mooli'
          }`}
        >
          {name}
        </h1>
    </section>
  );
};

export default DashboardBanner;
