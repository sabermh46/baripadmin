import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, DoorOpen, UserPlus, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The four things a house owner opens the dashboard to do.
 *
 * Every one of them was already reachable, and every one took a trip through the sidebar to
 * a list page and then a button in its corner — on a phone, three taps and two full page
 * loads before the form appears. These are the same destinations, one tap from the top of
 * the dashboard.
 *
 * 2×2 rather than a row of four: at 360px a four-across row leaves about 80px per tile,
 * which is not enough for a label that says what the button does.
 */
/**
 * There is no `/flats` route — flats are managed inside a house, so "Add flat" has to land
 * on one. With a single house that is unambiguous and it deep-links straight there; with
 * several it goes to the list, because guessing which house the owner meant is worse than
 * one extra tap.
 */
const buildActions = (houses) => [
  {
    key: 'loan',
    labelKey: 'record_loan_payment',
    hintKey: 'or_add_a_loan',
    icon: Landmark,
    to: '/loans',
    tone: 'text-violet-600 bg-violet-50',
  },
  {
    key: 'flat',
    labelKey: 'add_flat',
    hintKey: 'to_one_of_your_houses',
    icon: DoorOpen,
    to: houses?.length === 1 ? `/houses/${houses[0].id}` : '/houses',
    tone: 'text-blue-600 bg-blue-50',
  },
  {
    key: 'renter',
    labelKey: 'add_renter',
    hintKey: 'and_assign_a_flat',
    icon: UserPlus,
    to: '/renters',
    tone: 'text-emerald-600 bg-emerald-50',
  },
  {
    key: 'expense',
    labelKey: 'add_expense',
    hintKey: 'repairs_bills_salaries',
    icon: Receipt,
    to: '/expenses',
    tone: 'text-amber-600 bg-amber-50',
  },
];

const QuickActions = ({ houses = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const actions = buildActions(houses);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {t('quick_actions')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ key, labelKey, hintKey, icon: Icon, to, tone }) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(to)}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-primary/40 hover:bg-gray-50"
          >
            <span className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">{t(labelKey)}</span>
              {/* Hidden on the narrowest screens: two lines per tile turns the 2×2 into a
                  block deep enough to push the payment lists below the fold, which is the
                  opposite of what putting these at the top is for. */}
              <span className="hidden sm:block text-xs text-gray-500 truncate">{t(hintKey)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
