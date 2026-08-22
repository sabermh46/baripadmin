import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../../hooks';

const fmtDate = (d) => {
  if (!d) return null;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

/**
 * Caretakers assigned to this house.
 *
 * On the old page this was a bare count with nothing behind it, so the one thing an owner
 * actually wants to know — who can do what here — was invisible. Each assignment lists its
 * granted permission keys, because a caretaker's authority is per-house and per-permission;
 * showing the name without the grants would imply blanket access they do not have.
 */
const HouseCaretakersSection = ({ caretakers = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('caretakers')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('caretakers_for_this_house', { count: caretakers.length })}</p>
        </div>

        {hasPermission('caretakers.assign') && (
          <button
            type="button"
            onClick={() => navigate('/caretakers')}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-primary/60 hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('manage_caretakers')}</span>
          </button>
        )}
      </div>

      {caretakers.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl py-8 text-center">
          <Users className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('no_caretakers_assigned')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {caretakers.map((a) => (
            <div key={a.assignmentId} className="border border-gray-200 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {a.caretaker?.name ?? t('unknown')}
                  </p>
                  {a.caretaker?.email && (
                    <a
                      href={`mailto:${a.caretaker.email}`}
                      className="text-xs text-gray-500 hover:text-primary inline-flex items-center gap-1.5 truncate"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      {a.caretaker.email}
                    </a>
                  )}
                </div>
                {a.expiresAt && (
                  <span className="shrink-0 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {t('expires_on', { date: fmtDate(a.expiresAt) })}
                  </span>
                )}
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {t('granted_permissions')}
                </p>
                {a.permissions?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {a.permissions.map((key) => (
                      <span key={key} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono">
                        {key}
                      </span>
                    ))}
                  </div>
                ) : (
                  // An assignment with no permissions can see the house and do nothing —
                  // worth stating, because it looks identical to a working one otherwise.
                  <p className="text-[11px] text-amber-700">{t('no_permissions_granted_warning')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default HouseCaretakersSection;
