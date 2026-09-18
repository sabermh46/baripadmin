import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TkSymbol from '../../common/TkSymbol';

/**
 * The flat detail screen's tab bar.
 *
 * WHAT WAS WRONG WITH THE OLD ONE
 * -------------------------------
 * The label animated open for the ACTIVE tab and collapsed to `max-w-0` for the others, so two
 * of the three tabs were bare icons. A shield and a clock face do not say "advance payments"
 * and "payment history" to anyone who has not already learned this screen, and with no
 * `aria-label` either, a screen reader announced two unnamed buttons. It was also not a
 * tablist: no roles, no `aria-selected`, and no arrow-key movement between tabs.
 *
 * SHAPE
 * -----
 * A segmented control on a subdued track, which is the pattern the rest of the app already
 * uses for grouped choices. Every tab keeps its label at every width - on phones the labels
 * shorten rather than disappear, because a shorter word still says what the tab is.
 *
 * Equal thirds below `sm` so the whole control spans the screen and each target is comfortably
 * wide; content-width from `sm` up so it does not stretch across a desktop.
 */
const FlatTabs = ({ tabs, activeTab, onChange, availableAdvance = 0 }) => {
  const { t } = useTranslation();
  const refs = useRef({});

  /**
   * Arrow keys move between tabs, which is what the tablist pattern promises and what anyone
   * navigating by keyboard will try. Home and End jump to the ends.
   */
  const handleKeyDown = (event) => {
    const order = tabs.map((tab) => tab.id);
    const current = order.indexOf(activeTab);
    let next = null;

    if (event.key === 'ArrowRight') next = (current + 1) % order.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + order.length) % order.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = order.length - 1;
    if (next === null) return;

    event.preventDefault();
    onChange(order[next]);
    refs.current[order[next]]?.focus();
  };

  return (
    <div className="mb-4 border-t-[0.5px] border-subdued/20 pt-4">
      <div
        role="tablist"
        aria-label={t('flat_sections') || 'Flat sections'}
        onKeyDown={handleKeyDown}
        className="flex gap-1 rounded-xl border border-subdued/15 bg-subdued p-1 sm:inline-flex"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(node) => { refs.current[tab.id] = node; }}
              role="tab"
              id={`flat-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`flat-panel-${tab.id}`}
              // Only the active tab is in the tab order; the arrow keys move within the set.
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`flex flex-wrap min-h-10 flex-1 items-center justify-center gap-x-2 gap-y-0 truncate rounded-lg py-1 text-sm font-medium transition-[background-color,color,padding,box-shadow] duration-300 sm:flex-none ${
                active
                  ? 'bg-white px-5 text-primary shadow-sm'
                  : 'bg-gray-300 px-3 text-subdued hover:bg-surface/60 hover:text-text'
              }`}
            >
              <Icon size={16} className="shrink-0 hidden xs:block" />

              {/* The label shortens on a phone rather than vanishing: "Payments" still says
                  what the tab is, where a clock face on its own does not. */}
              <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
              <span className="hidden sm:inline">{tab.label}</span>

              {/* The figure needs room three tabs wide do not have on a phone, so below `sm`
                  it becomes a dot - "there is advance available" - and the Advance tab itself
                  carries the number. */}
              {tab.id === 'advance' && availableAdvance > 0 && (
                <>
                  <span
                    className="ml-0.5 hidden rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-800 sm:inline"
                    title={`${t('remaining_available') || 'Remaining available'}: ${availableAdvance.toLocaleString()}`}
                  >
                    <TkSymbol />{availableAdvance.toLocaleString()}
                  </span>
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-green-500 sm:hidden"
                  />
                  <span className="sr-only">
                    {`${t('remaining_available') || 'Remaining available'}: ${availableAdvance.toLocaleString()}`}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FlatTabs;
