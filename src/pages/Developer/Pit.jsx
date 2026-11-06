import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CircleCheck, CircleSlash, Inbox, Mail, MessageSquare, Paperclip, Search, Trash2,
} from 'lucide-react';
import { downloadProtectedFile } from '../../components/common/ProtectedImage';
import {
  useClearPitMutation,
  useDeletePitMessageMutation,
  useGetPitMessageQuery,
  useGetPitMessagesQuery,
} from '../../store/api/developerApi';

/**
 * Developer panel → Mail & SMS pit. A small Mailpit for both channels: what the platform would
 * have sent while MAIL_MAILER=pit and SMS_PIT=true are set (barip-php config/pit.php).
 *
 * Refreshes every few seconds, so a schedule firing on the minute or a "send test" button shows
 * up here on its own. Off production only; the server answers 404 there.
 *
 * English only, like the panel's other developer tooling.
 */

const POLL_MS = 5000;

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

// SMS segments as a GSM gateway counts them: 160/153 for plain Latin text, 70/67 once any
// character outside GSM-7 appears (Bengali always does).
const segmentsOf = (text = '') => {
  const unicode = /[^\n\r\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà]/.test(text);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  const length = [...text].length;
  return { unicode, length, segments: length <= single ? 1 : Math.ceil(length / multi) };
};

const StatusLine = ({ on, label, setting }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
    {on ? <CircleCheck className="w-3.5 h-3.5" /> : <CircleSlash className="w-3.5 h-3.5" />}
    {label}: {on ? 'catching' : <>off — set <code className="font-mono">{setting}</code></>}
  </span>
);

const EmailView = ({ m }) => {
  const [mode, setMode] = useState(m.html ? 'html' : 'text');
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 p-4 space-y-1">
        <h2 className="text-lg font-semibold text-gray-900 wrap-break-word">{m.subject || '(no subject)'}</h2>
        <div className="text-xs text-gray-500"><span className="text-gray-400">To</span> {m.to}</div>
        {m.meta?.from && <div className="text-xs text-gray-500"><span className="text-gray-400">From</span> {m.meta.from}</div>}
        <div className="text-xs text-gray-400">{when(m.createdAt)}</div>
        <div className="flex items-center gap-2 pt-2">
          {['html', 'text'].map((v) => (
            <button key={v} type="button" onClick={() => setMode(v)} disabled={v === 'html' ? !m.html : !m.text}
              className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${mode === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        {m.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {m.attachments.map((a) => (
              <button key={a.index} type="button"
                onClick={() => downloadProtectedFile(`/developer/pit/${m.id}/attachments/${a.index}`, a.filename)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                <Paperclip className="w-3.5 h-3.5" /> {a.filename} <span className="text-gray-400">{kb(a.size)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Rendered as the recipient would see it, with no scripts: sandbox without allow-scripts. */}
      {mode === 'html'
        ? <iframe title="Email" sandbox="allow-popups" srcDoc={m.html} className="flex-1 min-h-[480px] w-full bg-white" />
        : <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm text-gray-800">{m.text}</pre>}
    </div>
  );
};

const SmsView = ({ m }) => {
  const s = segmentsOf(m.text || '');
  return (
    <div className="p-4 sm:p-6">
      <div className="text-xs text-gray-500"><span className="text-gray-400">To</span> <span className="font-mono">{m.to}</span></div>
      <div className="text-xs text-gray-400">{when(m.createdAt)}{m.meta?.provider ? ` · via ${m.meta.provider}` : ''}</div>
      <div className="mt-5 max-w-sm rounded-3xl border-8 border-gray-800 bg-gray-50 p-4 shadow-xl">
        <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-sm whitespace-pre-wrap wrap-break-word">
          {m.text}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 max-w-sm text-center">
        <div className="rounded-lg bg-gray-50 p-2"><dt className="text-[11px] text-gray-500">Characters</dt><dd className="font-semibold text-gray-900">{s.length}</dd></div>
        <div className="rounded-lg bg-gray-50 p-2"><dt className="text-[11px] text-gray-500">Segments</dt><dd className="font-semibold text-gray-900">{s.segments}</dd></div>
        <div className="rounded-lg bg-gray-50 p-2"><dt className="text-[11px] text-gray-500">Encoding</dt><dd className="font-semibold text-gray-900">{s.unicode ? 'Unicode' : 'GSM-7'}</dd></div>
      </dl>
    </div>
  );
};

const Preview = ({ id, onDelete }) => {
  const { data, isFetching } = useGetPitMessageQuery(id);
  const m = data?.data;
  if (!m) return <div className="p-6 text-sm text-gray-400">{isFetching ? 'Loading…' : 'Not found.'}</div>;
  return (
    <div className="relative h-full">
      <button type="button" onClick={onDelete} title="Delete"
        className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
        <Trash2 className="w-4 h-4" />
      </button>
      {m.channel === 'email' ? <EmailView key={m.id} m={m} /> : <SmsView m={m} />}
    </div>
  );
};

const PitPage = () => {
  const [channel, setChannel] = useState('email');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading } = useGetPitMessagesQuery({ channel, q }, { pollingInterval: POLL_MS });
  const [deleteMessage] = useDeletePitMessageMutation();
  const [clearPit] = useClearPitMutation();

  const pit = data?.data;
  const messages = pit?.messages || [];
  const status = pit?.status;

  const switchTo = (c) => { setChannel(c); setSelected(null); };
  const remove = async (id) => { await deleteMessage(id); setSelected(null); };
  const clear = async () => {
    if (!window.confirm(`Delete every ${channel === 'email' ? 'email' : 'SMS'} in the pit?`)) return;
    await clearPit(channel);
    setSelected(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <Link to="/developer" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Developer panel
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl md:text-2xl font-bold text-gray-900">
          <Inbox className="h-5 w-5 text-primary" /> Mail &amp; SMS pit
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          What the platform sent while the pits are on: caught here instead of reaching a real inbox or phone.
        </p>
        {status && (
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusLine on={status.mail} label="Email" setting="MAIL_MAILER=pit" />
            <StatusLine on={status.sms} label="SMS" setting="SMS_PIT=true" />
            {status.configCached && (
              <span className="text-xs text-amber-700">Config is cached: run <code className="font-mono">php artisan config:cache</code> after changing .env.</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1">
          {[['email', 'Email', Mail], ['sms', 'SMS', MessageSquare]].map(([c, label, Icon]) => (
            <button key={c} type="button" onClick={() => switchTo(c)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${channel === c ? 'bg-primary text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon className="w-4 h-4" /> {label}
              {pit?.unread?.[c] > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] ${channel === c ? 'bg-white/25' : 'bg-primary text-white'}`}>{pit.unread[c]}</span>
              )}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient, subject or text"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <button type="button" onClick={clear} disabled={!messages.length}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-red-200 hover:text-red-600 disabled:opacity-40">
          <Trash2 className="w-4 h-4" /> Clear
        </button>
      </div>

      <div className="grid md:grid-cols-[22rem_1fr] rounded-2xl border border-gray-200 bg-white overflow-hidden min-h-[560px]">
        {/* On a phone the list and the open message take turns. */}
        <ul className={`divide-y divide-gray-100 overflow-y-auto md:max-h-[720px] md:border-r md:border-gray-200 ${selected ? 'hidden md:block' : ''}`}>
          {isLoading ? (
            <li className="p-4 text-sm text-gray-400">Loading…</li>
          ) : messages.length === 0 ? (
            <li className="p-8 text-center text-sm text-gray-400">
              Nothing caught yet.{!status?.[channel === 'email' ? 'mail' : 'sms'] && ' The pit for this channel is off.'}
            </li>
          ) : messages.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setSelected(m.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selected === m.id ? 'bg-primary-100/40' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${m.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {!m.read && <span className="inline-block w-2 h-2 mr-1.5 rounded-full bg-primary align-middle" />}
                    {m.to}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">{when(m.createdAt)}</span>
                </div>
                {m.subject && <div className={`truncate text-sm ${m.read ? 'text-gray-600' : 'text-gray-900'}`}>{m.subject}</div>}
                <div className="truncate text-xs text-gray-500">
                  {m.attachments > 0 && <Paperclip className="inline w-3 h-3 mr-1" />}
                  {m.preview}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className={`min-w-0 ${selected ? '' : 'hidden md:block'}`}>
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="md:hidden m-3 inline-flex items-center gap-1 text-sm text-gray-500">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <Preview id={selected} onDelete={() => remove(selected)} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-sm text-gray-400">Pick a message to read it.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PitPage;
