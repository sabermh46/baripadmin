import React from 'react';

/**
 * The template picker shared by the Email and SMS template pages.
 *
 * A vertical list from `lg` up; below that a single scrollable row of tabs, so on a phone the
 * editor is on screen straight away instead of under a stack of a dozen buttons.
 */
const TemplateList = ({ templates, selectedId, onSelect, isEdited }) => (
  <aside className="min-w-0">
    <div className="flex lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0 lg:bg-white lg:border lg:border-gray-200 lg:rounded-xl">
      {templates.map((tpl) => {
        const active = selectedId === tpl.id;
        const edited = isEdited(tpl);
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            aria-current={active ? 'true' : undefined}
            className={`shrink-0 text-left transition-colors whitespace-nowrap lg:whitespace-normal
              rounded-full border px-3.5 py-2 lg:rounded-none lg:border-0 lg:border-b lg:border-gray-100 lg:last:border-b-0 lg:px-4 lg:py-3 lg:first:rounded-t-xl lg:last:rounded-b-xl
              ${active
                ? 'bg-orange-50 border-orange-200 lg:border-gray-100'
                : 'bg-white border-gray-200 hover:bg-gray-50 lg:border-gray-100'}`}
          >
            <span className="flex items-center lg:items-start justify-between gap-2">
              <span className={`text-sm ${active ? 'font-semibold text-orange-800' : 'text-gray-800'}`}>
                {tpl.name}
              </span>
              {edited && (
                <span className="shrink-0 lg:mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 bg-orange-100 border border-orange-200 rounded px-1.5 py-0.5">
                  Edited
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  </aside>
);

export default TemplateList;
