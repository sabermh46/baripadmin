import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Mail, RotateCcw, Save, Loader2, AlertTriangle, Check, Braces, Eye, PencilLine,
} from 'lucide-react';
import {
  useGetEmailTemplatesQuery,
  useUpdateEmailTemplateMutation,
  useResetEmailTemplateMutation,
  usePreviewEmailTemplateMutation,
} from '../../../store/api/emailTemplateApi';
import { apiErrorMessage } from '../../../utils/apiError';

const BRAND = '#f9873c';

const seed = (template) =>
  Object.fromEntries(Object.entries(template.slots).map(([k, s]) => [k, s.value]));

/**
 * The fields and the preview for one template.
 *
 * Split out and remounted by `key` rather than syncing props into state with an effect —
 * the pattern RenterForm already settled on in this codebase. It also fixes something a
 * sync-on-change version gets wrong: Reset leaves the template id untouched, so an effect
 * keyed on the id would never re-seed and the editor would keep showing the wording that was
 * just discarded. The key includes `updatedAt`, so saving and resetting both remount with
 * whatever the server now holds.
 */
const TemplateEditor = ({ template, onSaved }) => {
  const [saveTemplate, { isLoading: isSaving }] = useUpdateEmailTemplateMutation();
  const [resetTemplate, { isLoading: isResetting }] = useResetEmailTemplateMutation();
  const [runPreview, { data: preview, isLoading: isPreviewing }] = usePreviewEmailTemplateMutation();

  const saved = useMemo(() => seed(template), [template]);
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState({});

  // Which field the caret was last in, so a variable chip inserts where the user is looking
  // rather than always appending to the end.
  const focusedRef = useRef(null);

  const isDirty = useMemo(
    () => Object.keys(saved).some((k) => (draft[k] ?? '') !== saved[k]),
    [draft, saved],
  );

  // Debounced, so a preview is not requested on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => runPreview({ id: template.id, slots: draft }), 450);
    return () => clearTimeout(id);
  }, [template.id, draft, runPreview]);

  const setSlot = useCallback((slot, value) => {
    setDraft((d) => ({ ...d, [slot]: value }));
    setErrors((e) => (e[slot] ? { ...e, [slot]: undefined } : e));
  }, []);

  const insertVariable = useCallback((variable) => {
    const target = focusedRef.current;
    if (!target?.el) {
      toast.info('Click into a field first, then choose a variable.');
      return;
    }
    const { slot, el } = target;
    const token = `{${variable}}`;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;

    setSlot(slot, `${el.value.slice(0, start)}${token}${el.value.slice(end)}`);

    // Put the caret after what was just inserted, once React has re-rendered the value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }, [setSlot]);

  const handleSave = async () => {
    setErrors({});
    try {
      await saveTemplate({ id: template.id, slots: draft }).unwrap();
      toast.success(`"${template.name}" saved.`);
      onSaved?.();
    } catch (err) {
      // The server names the offending slot, so put the message on the field rather than in
      // a toast that does not say which of eight boxes is wrong.
      const fieldErrors = err?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length) {
        setErrors(Object.fromEntries(fieldErrors.map((e) => [e.field, e.message])));
        toast.error('Please fix the highlighted fields.');
      } else {
        toast.error(apiErrorMessage(err, 'Could not save the template.'));
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Restore "${template.name}" to the default wording? Your changes to it will be lost.`)) return;
    try {
      await resetTemplate(template.id).unwrap();
      toast.success(`"${template.name}" restored to default.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reset the template.'));
    }
  };

  return (
    <>
      <section className="flex-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <PencilLine size={16} style={{ color: BRAND }} /> {template.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting || !template.customised}
                title={template.customised ? 'Restore the original wording' : 'This template is already the default'}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Reset to default
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isDirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
          </div>

          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5 mb-2">
              <Braces size={12} /> Variables — click to insert at the cursor
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(template.variables).map(([key, description]) => (
                <button
                  key={key}
                  type="button"
                  title={description}
                  onClick={() => insertVariable(key)}
                  className="text-xs font-mono px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  {`{${key}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {Object.entries(template.slots).map(([slot, meta]) => {
              const value = draft[slot] ?? '';
              const error = errors[slot];
              const changedFromDefault = value !== meta.default;
              const Field = meta.type === 'text' ? 'textarea' : 'input';

              return (
                <div key={slot}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">{meta.label}</label>
                    {changedFromDefault && (
                      <button
                        type="button"
                        onClick={() => setSlot(slot, meta.default)}
                        className="text-[11px] text-gray-400 hover:text-orange-600 underline"
                      >
                        revert this line
                      </button>
                    )}
                  </div>
                  <Field
                    value={value}
                    rows={meta.type === 'text' ? 4 : undefined}
                    onChange={(e) => setSlot(slot, e.target.value)}
                    onFocus={(e) => { focusedRef.current = { slot, el: e.target }; }}
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors resize-y ${
                      error
                        ? 'border-red-300 bg-red-50 focus:border-red-400'
                        : 'border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100'
                    }`}
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-600 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </p>
                  )}
                  {meta.type === 'text' && !error && (
                    <p className="mt-1 text-[11px] text-gray-400">Leave a blank line between paragraphs.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="xl:w-[420px] shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden xl:sticky xl:top-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Eye size={15} style={{ color: BRAND }} /> Preview
            </h3>
            {isPreviewing ? (
              <Loader2 size={14} className="animate-spin text-gray-400" />
            ) : (
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Check size={12} /> sample data
              </span>
            )}
          </div>

          {preview?.subject && (
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Subject</p>
              <p className="text-sm text-gray-800 mt-0.5 break-words">{preview.subject}</p>
            </div>
          )}

          {/* An iframe, not a div: the email's own table layout and inline styles would
              otherwise inherit from the app's stylesheet and preview something the recipient
              will never see. `sandbox` with no permissions blocks scripts. */}
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview?.html || '<p style="font-family:sans-serif;color:#9ca3af;padding:16px">Loading preview…</p>'}
            className="w-full h-[560px] bg-white"
          />
        </div>
      </section>
    </>
  );
};

/**
 * Lets the web owner edit the wording of every transactional email.
 *
 * Only the COPY is editable — the layout, tables and buttons stay in Blade on the server.
 * That is not a limitation to work around: those templates are PHP, so an editable body
 * would be arbitrary code execution, and the inline styles and Outlook fallbacks are exactly
 * what someone editing prose would break. Each template exposes named slots instead, and the
 * server escapes whatever is typed into them.
 *
 * The preview is the real Blade template rendered with sample data, and it re-renders from
 * the UNSAVED draft — so a wording can be tried before it is committed to a template that
 * live email is already going out from.
 */
const EmailTemplatesPage = () => {
  const { data: templates = [], isLoading } = useGetEmailTemplatesQuery();
  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) || templates[0] || null,
    [templates, selectedId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading templates…
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 mb-5">
        <Mail style={{ color: BRAND }} size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Email templates</h1>
          <p className="text-xs text-gray-500">
            Edit the wording of the emails your customers receive. The layout and branding stay fixed.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-60 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {templates.map((tpl) => {
              const active = selected?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                    active ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm ${active ? 'font-semibold text-orange-800' : 'text-gray-800'}`}>
                      {tpl.name}
                    </span>
                    {tpl.customised && (
                      <span className="shrink-0 mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 bg-orange-100 border border-orange-200 rounded px-1.5 py-0.5">
                        Edited
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {selected && (
          <TemplateEditor
            key={`${selected.id}:${selected.updatedAt ?? 'default'}`}
            template={selected}
          />
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesPage;
