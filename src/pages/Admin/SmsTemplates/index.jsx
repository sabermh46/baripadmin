import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  MessageSquareText, RotateCcw, Save, Loader2, AlertTriangle, Braces, PencilLine, Smartphone, Info,
} from 'lucide-react';
import {
  useGetEmailTemplatesQuery,
  useUpdateEmailTemplateMutation,
  useResetEmailTemplateMutation,
  usePreviewEmailTemplateMutation,
} from '../../../store/api/emailTemplateApi';
import { apiErrorMessage } from '../../../utils/apiError';
import TemplateList from '../EmailTemplates/TemplateList';

const BRAND = '#f9873c';
const SLOT = 'sms';

/**
 * The SMS text of one template, its variables, and the message as a renter's phone shows it.
 *
 * Remounted by `key` on save and reset, as the email editor is, so the draft always starts
 * from what the server now holds.
 */
const SmsEditor = ({ template }) => {
  const [saveTemplate, { isLoading: isSaving }] = useUpdateEmailTemplateMutation();
  const [resetTemplate, { isLoading: isResetting }] = useResetEmailTemplateMutation();
  const [runPreview, { data: preview, isLoading: isPreviewing }] = usePreviewEmailTemplateMutation();

  const slot = template.slots[SLOT];
  const [draft, setDraft] = useState(slot.value);
  const [error, setError] = useState(null);
  const fieldRef = useRef(null);

  const isDirty = draft !== slot.value;

  // Debounced; the server substitutes the sample values and measures the result.
  useEffect(() => {
    const id = setTimeout(() => runPreview({ id: template.id, slots: { [SLOT]: draft }, channel: 'sms' }), 350);
    return () => clearTimeout(id);
  }, [template.id, draft, runPreview]);

  const change = (value) => {
    setDraft(value);
    setError(null);
  };

  const insertVariable = useCallback((variable) => {
    const el = fieldRef.current;
    if (!el) return;
    const token = `{${variable}}`;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    change(`${el.value.slice(0, start)}${token}${el.value.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    try {
      await saveTemplate({ id: template.id, slots: { [SLOT]: draft } }).unwrap();
      toast.success(`"${template.name}" SMS saved.`);
    } catch (err) {
      const fieldError = err?.data?.errors?.find?.((e) => e.field === SLOT);
      if (fieldError) {
        setError(fieldError.message);
      } else {
        toast.error(apiErrorMessage(err, 'Could not save the SMS.'));
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Restore the "${template.name}" SMS to the default wording? Your changes to it will be lost.`)) return;
    try {
      await resetTemplate({ id: template.id, channel: 'sms' }).unwrap();
      toast.success(`"${template.name}" SMS restored to default.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reset the SMS.'));
    }
  };

  const unicode = preview?.encoding === 'UCS-2';
  const segments = preview?.segments ?? 1;

  return (
    // Editor and phone side by side only where both fit at a readable width; below that the
    // phone goes under the editor. minmax(0, 1fr) is what stops a long SMS line from widening
    // the column and squeezing the editor to one word per line.
    <div className="min-w-0 grid gap-4 items-start 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-64">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <PencilLine size={16} className="shrink-0" style={{ color: BRAND }} /> {template.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting || !slot.customised}
                title={slot.customised ? 'Restore the original wording' : 'This SMS is already the default'}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Reset to default
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isDirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-100">
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

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="sms-text" className="text-xs font-semibold text-gray-600">SMS message</label>
              {draft !== slot.default && (
                <button
                  type="button"
                  onClick={() => change(slot.default)}
                  className="text-[11px] text-gray-400 hover:text-orange-600 underline"
                >
                  revert to default
                </button>
              )}
            </div>
            <textarea
              id="sms-text"
              ref={fieldRef}
              value={draft}
              rows={5}
              onChange={(e) => change(e.target.value)}
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

            <ul className="mt-4 space-y-2 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <Info size={13} className="shrink-0 mt-0.5 text-gray-400" />
                <span>
                  Plain English text fits 160 characters in one SMS. Any Bengali letter, or a symbol
                  such as ৳, switches the whole message to Unicode, where one SMS holds 70.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Info size={13} className="shrink-0 mt-0.5 text-gray-400" />
                <span>
                  Every SMS is taken from the house owner&apos;s SMS balance, once per renter. Amounts
                  are written as &quot;BDT&quot; for this reason.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden 2xl:sticky 2xl:top-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Smartphone size={15} style={{ color: BRAND }} /> Preview
            </h3>
            {isPreviewing
              ? <Loader2 size={14} className="animate-spin text-gray-400" />
              : <span className="text-[11px] text-gray-400">sample data</span>}
          </div>

          <div className="p-4 sm:p-5 max-w-md mx-auto">
            <div className="mx-auto w-full max-w-[300px] rounded-4xl border-8 border-gray-800 bg-gray-100 shadow-xl overflow-hidden">
              <div className="bg-white/80 px-4 py-2.5 text-center border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-800">Bari Porichalona</p>
                <p className="text-[10px] text-gray-400">Text message</p>
              </div>
              <div className="min-h-[220px] px-3 py-4">
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-900 shadow-sm whitespace-pre-wrap wrap-break-word">
                  {preview?.text ?? '…'}
                </div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 p-2">
                <dt className="text-[11px] text-gray-500">Characters</dt>
                <dd className="font-semibold text-gray-900">{preview?.characters ?? '–'}</dd>
              </div>
              <div className={`rounded-lg p-2 ${segments > 1 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <dt className="text-[11px] text-gray-500">SMS per renter</dt>
                <dd className={`font-semibold ${segments > 1 ? 'text-orange-700' : 'text-gray-900'}`}>{preview ? segments : '–'}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <dt className="text-[11px] text-gray-500">Encoding</dt>
                <dd className="font-semibold text-gray-900">{preview ? (unicode ? 'Unicode' : 'GSM-7') : '–'}</dd>
              </div>
            </dl>

            {preview && (
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                {unicode ? '70' : '160'} characters fit in one SMS; a longer message is split into
                parts of {unicode ? '67' : '153'}. Counted with sample values, so a long name or
                amount can add a part.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * Lets the web owner edit the SMS text of every message that can also go out by SMS.
 *
 * The SMS is the `sms` slot of the same template the Email templates page edits; this page
 * saves and resets only that slot, and that page only the others.
 */
const SmsTemplatesPage = () => {
  const { data: all = [], isLoading } = useGetEmailTemplatesQuery();
  const templates = useMemo(() => all.filter((t) => t.slots?.[SLOT]), [all]);
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
      <div className="flex items-start gap-3 mb-5">
        <MessageSquareText className="shrink-0 mt-0.5" style={{ color: BRAND }} size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">SMS templates</h1>
          <p className="text-xs text-gray-500">
            Edit the text messages renters receive. Keep them short: every SMS is paid for from the house owner&apos;s balance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 items-start lg:grid-cols-[15rem_minmax(0,1fr)]">
        <TemplateList
          templates={templates}
          selectedId={selected?.id}
          onSelect={setSelectedId}
          isEdited={(tpl) => tpl.slots[SLOT].customised}
        />

        {selected && (
          <SmsEditor
            key={`${selected.id}:${selected.updatedAt ?? 'default'}:${selected.slots[SLOT].value}`}
            template={selected}
          />
        )}
      </div>
    </div>
  );
};

export default SmsTemplatesPage;
