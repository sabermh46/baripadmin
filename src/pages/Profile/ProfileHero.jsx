import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2, Mail, ShieldCheck, User } from 'lucide-react';
import ProtectedImage from '../../components/common/ProtectedImage';
import { roleTheme } from './roleTheme';

const joinedText = (createdAt) => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  return { date: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), days };
};

/**
 * The top of the profile — a cover band tinted to the signed-in role, with the avatar
 * straddling the edge of it.
 *
 * Built portrait-first. The old page opened with a centred avatar and then repeated the name
 * and role immediately underneath in a definition list, so on a phone the first screenful was
 * the same two facts three times over and nothing else. Here the cover carries the identity
 * and the rows below carry only what the cover does not already say.
 */
const ProfileHero = ({ user, avatarPath, googleAvatar, onPickAvatar, isUploading, error }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const theme = roleTheme(user?.role?.slug);
  const RoleIcon = theme.icon;
  const joined = joinedText(user?.createdAt);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`h-24 sm:h-28 bg-linear-to-br ${theme.cover} relative`}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute right-16 top-8 h-20 w-20 rounded-full bg-white/5" />
      </div>

      {/* The row is pulled up so the avatar straddles the band. items-START, not items-end:
          bottom-aligning pinned the text block's bottom to the avatar's, so the block grew
          UPWARD as it got taller and the name — the first line in it — landed at 80-112px,
          entirely inside the 0-112px dark cover. text-gray-900 on a dark gradient renders as
          nothing, so the name simply was not there on any screen 640px or wider. Mobile
          escaped it only because the column layout puts the text below the avatar. */}
      <div className="px-4 sm:px-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 -mt-12 sm:-mt-14">
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <div className={`h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ring-4 ring-white shadow-md`}>
              {avatarPath ? (
                <ProtectedImage src={avatarPath} alt={user?.name} className="w-full h-full object-cover" />
              ) : googleAvatar ? (
                <img src={googleAvatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-gray-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              aria-label={t('change_profile_picture')}
              className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>

            <input
              ref={inputRef}
              type="file"
              // Anything the browser can decode: it is re-encoded to WebP on this
              // device before upload, so the source format no longer has to match
              // what the server accepts.
              accept="image/*"
              onChange={onPickAvatar}
              className="hidden"
            />
          </div>

          {/* 64px clears the 56px the row was pulled up by, leaving the name 8px below the
              band rather than on it. */}
          <div className="min-w-0 flex-1 text-center sm:text-left sm:mt-16">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{user?.name || t('not_set')}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${theme.chip}`}>
                <RoleIcon className="h-3 w-3" />
                {user?.role?.name}
              </span>
              {!user?.needsPasswordSetup && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                  <ShieldCheck className="h-3 w-3" />
                  {t('secured')}
                </span>
              )}
            </div>
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-gray-500 mt-2 min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
          </div>
        </div>

        {/* Time served, said as a length rather than a date — "1 year 2 months with us" is a
            different sentence from "created 03/06/2025", and it is the true one. */}
        {joined && (
          <p className="text-xs text-gray-500 text-center sm:text-left mt-4 pt-4 border-t border-gray-100">
            {t('member_since_for', { date: joined.date, count: joined.days })}
          </p>
        )}

        {error && <p className="text-xs text-red-600 text-center sm:text-left mt-2">{error}</p>}
      </div>
    </section>
  );
};

export default ProfileHero;
