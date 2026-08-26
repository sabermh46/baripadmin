import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Minus, ShieldCheck } from 'lucide-react';

/**
 * Tick boxes, press Save, one request.
 *
 * Deliberately *not* wired to save on each toggle. Permissions are read as a set — "can this
 * person delete renters but not houses" — and an editor that commits every click makes the
 * person editing walk through states they never intended, each one briefly real and each one
 * its own audit entry. Cancel only means something if nothing has been sent yet.
 *
 * Identity is a prop because the two callers key on different things: staff grants are rows
 * keyed by permission id, caretaker grants are validated against permission keys. Passing
 * `identify` keeps one editor rather than two that drift.
 */
const PermissionEditor = ({
  permissions = [],
  selected = [],
  identify = (p) => p.id,
  onSave,
  isSaving = false,
  disabled = false,
  disabledReason,
  title = 'Quick permissions',
  subtitle,
}) => {
  // `selected` is the saved truth; `draft` is what the admin is looking at.
  const [draft, setDraft] = useState(() => new Set(selected));

  // Re-baseline whenever the saved set changes — after a successful save, or when a refetch
  // brings someone else's edit down. Keyed on the sorted contents rather than the array
  // identity, which RTK Query gives us fresh on every poll and would wipe an in-progress edit.
  const savedKey = useMemo(() => [...selected].sort().join('|'), [selected]);
  useEffect(() => {
    setDraft(new Set(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const groups = useMemo(() => {
    const map = new Map();
    permissions.forEach((p) => {
      const name = String(p.key ?? '').split('.')[0] || 'other';
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(p);
    });
    return [...map.entries()]
      .map(([name, items]) => [name, items.sort((a, b) => a.key.localeCompare(b.key))])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const savedSet = useMemo(() => new Set(selected), [selected]);
  const added = [...draft].filter((id) => !savedSet.has(id));
  const removed = [...savedSet].filter((id) => !draft.has(id));
  const dirty = added.length > 0 || removed.length > 0;

  const toggle = (id) => {
    if (disabled) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (items, allOn) => {
    if (disabled) return;
    setDraft((prev) => {
      const next = new Set(prev);
      items.forEach((p) => (allOn ? next.delete(identify(p)) : next.add(identify(p))));
      return next;
    });
  };

  const handleSave = () => {
    if (!dirty || disabled) return;
    onSave?.([...draft]);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {draft.size} of {permissions.length} selected
        </span>
      </div>

      {disabled && disabledReason && (
        <p className="px-4 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">{disabledReason}</p>
      )}

      <div className="p-4 space-y-4 max-h-[26rem] overflow-y-auto">
        {groups.length === 0 && <p className="text-sm text-gray-500">No permissions available.</p>}

        {groups.map(([name, items]) => {
          const on = items.filter((p) => draft.has(identify(p))).length;
          const allOn = on === items.length;
          const someOn = on > 0 && !allOn;

          return (
            <div key={name}>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(items, allOn)}
                  disabled={disabled}
                  className="flex items-center gap-2 group disabled:cursor-not-allowed"
                >
                  <span
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                      allOn
                        ? 'bg-primary border-primary text-white'
                        : someOn
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-white border-gray-300 group-hover:border-gray-400'
                    }`}
                  >
                    {allOn && <Check className="h-3 w-3" />}
                    {someOn && <Minus className="h-3 w-3" />}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {name.replace(/_/g, ' ')}
                  </span>
                </button>
                <span className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] text-gray-400 tabular-nums">{on}/{items.length}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-1.5">
                {items.map((p) => {
                  const id = identify(p);
                  const checked = draft.has(id);
                  const changed = checked !== savedSet.has(id);

                  return (
                    <label
                      key={id}
                      className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                        disabled ? 'cursor-not-allowed opacity-60' : ''
                      } ${
                        changed
                          ? checked
                            ? 'border-green-300 bg-green-50'
                            : 'border-red-200 bg-red-50'
                          : checked
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/40"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-gray-900 truncate">{p.key}</span>
                        {p.description && (
                          <span className="block text-[11px] text-gray-500 leading-snug">{p.description}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* Says what pressing Save will do, in the same breath as the button that does it. */}
        <p className="text-xs text-gray-600 min-w-0">
          {dirty ? (
            <>
              {added.length > 0 && <span className="text-green-700 font-medium">+{added.length} to grant</span>}
              {added.length > 0 && removed.length > 0 && <span className="text-gray-400"> · </span>}
              {removed.length > 0 && <span className="text-red-700 font-medium">−{removed.length} to revoke</span>}
            </>
          ) : (
            <span className="text-gray-400">No changes</span>
          )}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDraft(new Set(selected))}
            disabled={!dirty || isSaving}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isSaving || disabled}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PermissionEditor;
