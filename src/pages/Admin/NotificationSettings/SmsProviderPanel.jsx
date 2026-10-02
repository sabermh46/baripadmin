import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Check, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw, Send, Terminal, Trash2, Wallet, X,
} from 'lucide-react';
import {
  useDeleteSmsProviderMutation,
  useGetSmsProvidersQuery,
  useLazyGetSmsProviderBalanceQuery,
  useSaveSmsProviderMutation,
  useTestSmsProviderMutation,
} from '../../../store/api/notificationSettingsApi';
import { apiErrorMessage } from '../../../utils/apiError';
import { showMessageInLanguage } from '../../../utils/showMessageInLanguage';

const BULKSMSBD = 'bulksmsbd';

/**
 * bulksmsbd.com has its request shape built into the API, so the form is only what the
 * owner gets from their BulkSMSBD account. The key is write-only: it is never sent back, so
 * `api_key` stays blank on edit and blank means "keep the saved one".
 */
const BLANK_BULKSMSBD = {
  driver: BULKSMSBD,
  name: 'BulkSMSBD',
  sender_id: '',
  api_key: '',
  savedKeyHint: '',
  is_active: false,
};

const BLANK = {
  driver: 'generic',
  name: '',
  api_url: '',
  http_method: 'GET',
  body_format: 'form',
  recipient_param: 'to',
  message_param: 'message',
  sender_param: '',
  sender_id: '',
  auth_params: [{ k: '', v: '' }],
  extra_params: [],
  headers: [],
  success_rule: { mode: 'http_status', value: '', path: '', equals: '' },
  is_active: false,
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

const pairsToObject = (pairs) =>
  Object.fromEntries((pairs ?? []).filter((p) => p.k?.trim()).map((p) => [p.k.trim(), p.v ?? '']));

const objectToPairs = (obj) => Object.entries(obj ?? {}).map(([k, v]) => ({ k, v: String(v ?? '') }));

/** A provider from the API, as the edit form holds it. */
const toForm = (p) => (p.driver === BULKSMSBD
  ? {
    ...BLANK_BULKSMSBD,
    id: p.id,
    name: p.name,
    sender_id: p.sender_id ?? '',
    // Masked by the server (••••••••abcd) — a hint at which key is saved, never the key.
    savedKeyHint: p.auth_params?.api_key ?? '',
    credentialsUnreadable: !!p.credentialsUnreadable,
    is_active: !!p.is_active,
  }
  : {
    ...p,
    sender_param: p.sender_param ?? '',
    sender_id: p.sender_id ?? '',
    // Values arrive masked; sending a mask back unchanged keeps the stored value.
    auth_params: objectToPairs(p.auth_params),
    extra_params: objectToPairs(p.extra_params),
    headers: objectToPairs(p.headers),
    success_rule: { mode: 'http_status', value: '', path: '', equals: '', ...(p.success_rule ?? {}) },
  });

const formatBalance = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** A repeating key/value editor — the shape every part of these gateways is described in. */
const PairEditor = ({ label, hint, pairs, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange([...(pairs ?? []), { k: '', v: '' }])}
        className="text-[11px] font-semibold text-primary hover:underline"
      >
        + {label}
      </button>
    </div>
    {hint && <p className="text-[11px] text-gray-400 mb-1.5">{hint}</p>}
    <div className="space-y-1.5">
      {(pairs ?? []).length === 0 && <p className="text-[11px] text-gray-400">—</p>}
      {(pairs ?? []).map((pair, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            type="text"
            value={pair.k}
            placeholder="name"
            onChange={(e) => onChange(pairs.map((p, j) => (j === i ? { ...p, k: e.target.value } : p)))}
            className={`${input} font-mono`}
          />
          <input
            type="text"
            value={pair.v}
            placeholder="value"
            onChange={(e) => onChange(pairs.map((p, j) => (j === i ? { ...p, v: e.target.value } : p)))}
            className={`${input} font-mono`}
          />
          <button
            type="button"
            onClick={() => onChange(pairs.filter((_, j) => j !== i))}
            className="shrink-0 px-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

/** Name, sender ID and API key — everything else about bulksmsbd is fixed on the server. */
const BulkSmsBdFields = ({ editing, setEditing, t }) => {
  const [reveal, setReveal] = useState(false);
  const set = (key) => (e) => setEditing((p) => ({ ...p, [key]: e.target.value }));
  const hasSavedKey = !!editing.savedKeyHint && !editing.credentialsUnreadable;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        {t('bulksmsbd_form_hint')}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">{t('sms_gateway_name')}</span>
          <input type="text" value={editing.name} onChange={set('name')} className={input} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">{t('sender_id')}</span>
          <input type="text" value={editing.sender_id} onChange={set('sender_id')} className={`${input} font-mono`} placeholder="8809617xxxxxx" />
          <span className="block text-[11px] text-gray-400 mt-1">{t('bulksmsbd_sender_id_hint')}</span>
        </label>
      </div>

      <label className="block">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
          <KeyRound className="h-3.5 w-3.5 text-gray-400" />
          {t('api_key')}
        </span>
        <div className="relative">
          <input
            type={reveal ? 'text' : 'password'}
            value={editing.api_key}
            onChange={set('api_key')}
            // Keeps the browser's password manager from offering the admin's login here.
            autoComplete="new-password"
            spellCheck={false}
            placeholder={hasSavedKey ? editing.savedKeyHint : t('bulksmsbd_api_key_placeholder')}
            className={`${input} font-mono pr-10`}
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? t('hide') : t('show')}
            className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <span className="block text-[11px] text-gray-400 mt-1">
          {hasSavedKey ? t('api_key_saved_hint') : t('api_key_encrypted_hint')}
        </span>
      </label>
    </div>
  );
};

/**
 * Describe an SMS gateway as an HTTP call, then try it.
 *
 * No package, no driver per vendor. What differs between these gateways is only the names of
 * things — one wants `msisdn`, the next `to`, the next `receiver` — so the form IS the
 * integration.
 *
 * The test defaults to a dry run, which shows the exact URL that would be called and sends
 * nothing. Getting a gateway's parameter names right is trial and error, and in live mode
 * every wrong guess costs a real message.
 *
 * bulksmsbd.com is the exception to "the form is the integration": its shape is built in, so
 * it gets a three-field form and a balance check instead.
 */
const SmsProviderPanel = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetSmsProvidersQuery();
  const [save, { isLoading: isSaving }] = useSaveSmsProviderMutation();
  const [remove] = useDeleteSmsProviderMutation();
  const [runTest, { isLoading: isTesting }] = useTestSmsProviderMutation();
  const [fetchBalance] = useLazyGetSmsProviderBalanceQuery();

  const [editing, setEditing] = useState(null);
  const [testTo, setTestTo] = useState('');
  const [result, setResult] = useState(null);
  // { [providerId]: { loading, balance, error } } — asked on demand, never on page load.
  const [balances, setBalances] = useState({});

  const providers = data?.data ?? [];

  const openNew = (driver) => {
    // The first gateway should carry traffic without a second click; a later one should
    // not silently take over from the gateway that already does.
    const is_active = !providers.some((p) => p.is_active);
    setEditing(driver === BULKSMSBD ? { ...BLANK_BULKSMSBD, is_active } : { ...BLANK, is_active });
    setResult(null);
  };
  const openEdit = (p) => { setEditing(toForm(p)); setResult(null); };

  const set = (key) => (e) => setEditing((p) => ({ ...p, [key]: e.target.value }));

  const checkBalance = async (id) => {
    setBalances((b) => ({ ...b, [id]: { loading: true } }));
    try {
      const res = await fetchBalance(id).unwrap();
      setBalances((b) => ({ ...b, [id]: { loading: false, ...res.data } }));
    } catch (err) {
      setBalances((b) => ({ ...b, [id]: { loading: false, ok: false, error: showMessageInLanguage(apiErrorMessage(err, t('balance_check_failed'))) } }));
    }
  };

  const payload = () => (editing.driver === BULKSMSBD ? {
    id: editing.id,
    driver: BULKSMSBD,
    name: editing.name,
    sender_id: editing.sender_id,
    // Blank keeps the saved key; the server never sends it back to resend.
    api_key: editing.api_key?.trim() || null,
    is_active: !!editing.is_active,
  } : {
    id: editing.id,
    driver: 'generic',
    name: editing.name,
    api_url: editing.api_url,
    http_method: editing.http_method,
    body_format: editing.body_format,
    recipient_param: editing.recipient_param,
    message_param: editing.message_param,
    sender_param: editing.sender_param || null,
    sender_id: editing.sender_id || null,
    auth_params: pairsToObject(editing.auth_params),
    extra_params: pairsToObject(editing.extra_params),
    headers: pairsToObject(editing.headers),
    success_rule: editing.success_rule,
    is_active: !!editing.is_active,
  });

  const handleSave = async () => {
    try {
      const res = await save(payload()).unwrap();
      toast.success(t('provider_saved'));
      // Rebuilt from the response, which also drops the typed key from memory.
      setEditing(toForm(res.data));
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_save_provider'))));
    }
  };

  const handleTest = async (dryRun) => {
    if (!editing?.id) return toast.error(t('save_provider_before_testing'));
    if (!testTo.trim()) return toast.error(t('enter_a_number_to_test'));
    try {
      const res = await runTest({ id: editing.id, to: testTo.trim(), dryRun }).unwrap();
      setResult(res.data);
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('test_failed'))));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('sms_gateways')}</h3>
          <p className="text-xs text-gray-500">{t('sms_gateways_hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openNew(BULKSMSBD)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('add_bulksmsbd')}
          </button>
          <button
            type="button"
            onClick={() => openNew('generic')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            {t('add_custom_gateway')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
      ) : providers.length === 0 ? (
        <p className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-px shrink-0 text-amber-500" />
          {t('no_sms_provider_yet')}
        </p>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => {
            const bal = balances[p.id];
            return (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
                  {p.name}
                  {p.driver === BULKSMSBD && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                      BulkSMSBD
                    </span>
                  )}
                  {p.is_active && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                      {t('active')}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500 font-mono truncate">
                  {p.http_method} {p.api_url}
                  {p.driver === BULKSMSBD && p.sender_id && <span className="text-gray-400"> · {p.sender_id}</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {p.supportsBalance && !p.credentialsUnreadable && (
                  <button
                    type="button"
                    onClick={() => checkBalance(p.id)}
                    disabled={bal?.loading}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {bal?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : bal ? <RefreshCw className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                    {t('check_balance')}
                  </button>
                )}
                {p.lastTestResult && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.lastTestResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.lastTestResult.ok ? t('last_test_passed') : t('last_test_failed')}
                  </span>
                )}
                <button type="button" onClick={() => openEdit(p)} className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">
                  {t('edit')}
                </button>
                <button
                  type="button"
                  onClick={async () => { await remove(p.id); toast.success(t('provider_deleted')); if (editing?.id === p.id) setEditing(null); }}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {p.credentialsUnreadable && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                {t('credentials_unreadable')}
              </p>
            )}

            {bal && !bal.loading && (
              bal.ok ? (
                <p className="text-xs text-gray-700 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-green-600" />
                  {t('gateway_balance')}: <span className="font-semibold tabular-nums">{formatBalance(bal.balance)}</span>
                </p>
              ) : (
                <p className="text-[11px] text-red-700">{t('balance_check_failed')}{bal.error ? ` — ${bal.error}` : ''}</p>
              )
            )}
            </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          {editing.driver === BULKSMSBD ? (
            <BulkSmsBdFields editing={editing} setEditing={setEditing} t={t} />
          ) : (
          <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('sms_gateway_name')}</span>
              <input type="text" value={editing.name} onChange={set('name')} className={input} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('http_method')}</span>
              <select value={editing.http_method} onChange={set('http_method')} className={input}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('api_url')}</span>
            <input type="url" value={editing.api_url} onChange={set('api_url')} className={`${input} font-mono`} placeholder="https://gateway.example.com/api/send" />
            <span className="block text-[11px] text-gray-400 mt-1">{t('placeholders_hint')}</span>
          </label>

          {editing.http_method === 'POST' && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('body_format')}</span>
              <select value={editing.body_format} onChange={set('body_format')} className={input}>
                <option value="form">form-encoded</option>
                <option value="json">JSON</option>
              </select>
            </label>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('recipient_param')}</span>
              <input type="text" value={editing.recipient_param} onChange={set('recipient_param')} className={`${input} font-mono`} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('message_param')}</span>
              <input type="text" value={editing.message_param} onChange={set('message_param')} className={`${input} font-mono`} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('sender_param')}</span>
              <input type="text" value={editing.sender_param} onChange={set('sender_param')} className={`${input} font-mono`} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">{t('sender_id')}</span>
              <input type="text" value={editing.sender_id} onChange={set('sender_id')} className={input} />
            </label>
          </div>

          <PairEditor label={t('auth_parameters')} hint={`${t('auth_parameters_hint')} ${t('auth_parameters_masked_hint')}`} pairs={editing.auth_params} onChange={(v) => setEditing((p) => ({ ...p, auth_params: v }))} />
          <PairEditor label={t('extra_parameters')} pairs={editing.extra_params} onChange={(v) => setEditing((p) => ({ ...p, extra_params: v }))} />
          <PairEditor label={t('custom_headers')} pairs={editing.headers} onChange={(v) => setEditing((p) => ({ ...p, headers: v }))} />

          <div>
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('success_detection')}</span>
            <p className="text-[11px] text-gray-400 mb-1.5">{t('success_detection_hint')}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <select
                value={editing.success_rule.mode}
                onChange={(e) => setEditing((p) => ({ ...p, success_rule: { ...p.success_rule, mode: e.target.value } }))}
                className={input}
              >
                <option value="http_status">{t('rule_http_status')}</option>
                <option value="contains">{t('rule_contains')}</option>
                <option value="not_contains">{t('rule_not_contains')}</option>
                <option value="json_path">{t('rule_json_path')}</option>
              </select>
              {(editing.success_rule.mode === 'contains' || editing.success_rule.mode === 'not_contains') && (
                <input
                  type="text"
                  value={editing.success_rule.value}
                  placeholder="SUCCESS"
                  onChange={(e) => setEditing((p) => ({ ...p, success_rule: { ...p.success_rule, value: e.target.value } }))}
                  className={`${input} font-mono sm:col-span-2`}
                />
              )}
              {editing.success_rule.mode === 'json_path' && (
                <>
                  <input type="text" value={editing.success_rule.path} placeholder="result.status" onChange={(e) => setEditing((p) => ({ ...p, success_rule: { ...p.success_rule, path: e.target.value } }))} className={`${input} font-mono`} />
                  <input type="text" value={editing.success_rule.equals} placeholder="0" onChange={(e) => setEditing((p) => ({ ...p, success_rule: { ...p.success_rule, equals: e.target.value } }))} className={`${input} font-mono`} />
                </>
              )}
            </div>
          </div>
          </>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing((p) => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40" />
            {t('use_this_provider')}
          </label>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </button>
          </div>

          {/* Dry run first: it shows the exact call without spending a message. */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <span className="block text-xs font-medium text-gray-700">{t('try_it')}</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="tel" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="01712345678" className={input} />
              <button type="button" onClick={() => handleTest(true)} disabled={isTesting} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50">
                <Terminal className="h-4 w-4" />
                {t('preview_request')}
              </button>
              <button type="button" onClick={() => handleTest(false)} disabled={isTesting} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 whitespace-nowrap disabled:opacity-50">
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('send_for_real')}
              </button>
            </div>

            {result && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                {result.dryRun ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t('would_call')}</p>
                    <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap break-all">{result.request?.preview}</pre>
                    {/* A POST preview line has no parameters in it; the body is the part worth checking. Keys arrive masked. */}
                    {result.request?.method === 'POST' && (
                      <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap break-all">
                        {JSON.stringify(result.request.params, null, 2)}
                      </pre>
                    )}
                    {Object.keys(result.request?.headers ?? {}).length > 0 && (
                      <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap break-all">
                        {JSON.stringify(result.request.headers, null, 2)}
                      </pre>
                    )}
                  </>
                ) : (
                  <>
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {result.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {result.ok ? t('gateway_accepted_it') : t('gateway_rejected_it')}
                      <span className="font-normal text-gray-500">HTTP {result.status ?? '—'}</span>
                    </p>
                    {result.error && <p className="text-[11px] text-red-700">{result.error}</p>}
                    {result.body && (
                      <pre className="text-[11px] font-mono text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{result.body}</pre>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsProviderPanel;
