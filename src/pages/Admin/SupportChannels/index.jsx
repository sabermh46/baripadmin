import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ExternalLink, Eye, MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import Table from '../../../components/common/Table';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import {
  useCreateSupportChannelMutation,
  useDeleteSupportChannelMutation,
  useGetAdminSupportChannelsQuery,
  useUpdateSupportChannelMutation,
} from '../../../store/api/supportApi';
import { apiErrorMessage } from '../../../utils/apiError';
import { showMessageInLanguage } from '../../../utils/showMessageInLanguage';
import { CHANNEL_STYLE, displayTarget } from '../../../utils/supportLinks';

/**
 * Where support can be reached: the WhatsApp numbers and Messenger pages the Support page
 * offers. web_owner and developer, or staff holding `support.manage` (the route and the API
 * both check it).
 *
 * The server normalises what is typed (a local 01… number gets its 88; a pasted Facebook
 * link becomes the page username), so the list shows what will actually be dialled, and
 * "Test link" opens exactly what users will open.
 */
const EMPTY = { type: 'whatsapp', label: '', target: '', hours: '', sort_order: 0, is_active: true };

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';

const ChannelForm = ({ initial, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial, hours: initial?.hours ?? '' }));
  const [error, setError] = useState(null);
  const [createChannel, { isLoading: creating }] = useCreateSupportChannelMutation();
  const [updateChannel, { isLoading: updating }] = useUpdateSupportChannelMutation();
  const saving = creating || updating;
  const isEdit = !!initial?.id;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      type: form.type,
      label: form.label.trim(),
      target: form.target.trim(),
      hours: form.hours.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    try {
      if (isEdit) await updateChannel({ id: initial.id, ...payload }).unwrap();
      else await createChannel(payload).unwrap();
      toast.success(t('support_saved'));
      onClose();
    } catch (err) {
      setError(showMessageInLanguage(apiErrorMessage(err, 'Could not save the channel.')));
    }
  };

  const isWhatsApp = form.type === 'whatsapp';

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{isEdit ? t('support_edit_channel') : t('support_add_channel')}</h2>
        <button type="button" onClick={onClose} aria-label={t('cancel')} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t('support_type')}</span>
          <div role="radiogroup" className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {Object.entries(CHANNEL_STYLE).map(([type, s]) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={form.type === type}
                onClick={() => setForm((f) => ({ ...f, type }))}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  form.type === type ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t('support_label')}</span>
          <input value={form.label} onChange={set('label')} required maxLength={80} placeholder={t('support_label_placeholder')} className={inputClass} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {isWhatsApp ? t('support_whatsapp_number') : t('support_messenger_page')}
          </span>
          <input
            value={form.target}
            onChange={set('target')}
            required
            maxLength={200}
            inputMode={isWhatsApp ? 'tel' : 'text'}
            placeholder={isWhatsApp ? '+8801711000000' : 'bariporichalona'}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-400">
            {isWhatsApp ? t('support_whatsapp_number_hint') : t('support_messenger_page_hint')}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t('support_hours')}</span>
          <input value={form.hours} onChange={set('hours')} maxLength={120} placeholder={t('support_hours_placeholder')} className={inputClass} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t('support_order')}</span>
          <input type="number" min={0} max={1000} value={form.sort_order} onChange={set('sort_order')} className={inputClass} />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="h-4 w-4 accent-primary-600" />
          <span className="text-sm text-slate-700">{t('support_show_on_page')}</span>
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          {t('cancel')}
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
          {saving ? t('loading') : t('save')}
        </button>
      </div>
    </form>
  );
};

const SupportChannelsPage = () => {
  const { t } = useTranslation();
  const { data: channels = [], isLoading } = useGetAdminSupportChannelsQuery();
  const [updateChannel] = useUpdateSupportChannelMutation();
  const [deleteChannel, { isLoading: deleting }] = useDeleteSupportChannelMutation();
  // null = closed, {} = new, a channel = editing it.
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const toggleActive = async (row) => {
    try {
      await updateChannel({
        id: row.id,
        type: row.type,
        label: row.label,
        target: row.target,
        hours: row.hours,
        sort_order: row.sort_order,
        is_active: !row.is_active,
      }).unwrap();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, 'Could not update the channel.')));
    }
  };

  const columns = [
    {
      key: 'channel',
      title: t('support_type'),
      render: (row) => {
        const s = CHANNEL_STYLE[row.type] ?? CHANNEL_STYLE.whatsapp;
        return (
          <div className="flex items-center gap-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.tint}`}>
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{row.label}</p>
              <p className="text-xs text-slate-500">{s.name}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'contact', title: t('support_contact'), render: (row) => <span className="text-sm text-slate-700 tabular-nums">{displayTarget(row)}</span> },
    { key: 'hours', title: t('support_hours_short'), render: (row) => <span className="text-sm text-slate-500">{row.hours || '–'}</span> },
    { key: 'order', title: t('support_order'), render: (row) => <span className="text-sm text-slate-500 tabular-nums">{row.sort_order}</span> },
    {
      key: 'status',
      title: t('status'),
      render: (row) => (
        <button
          type="button"
          role="switch"
          aria-checked={row.is_active}
          onClick={() => toggleActive(row)}
          className="inline-flex items-center gap-2 text-sm"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors ${row.is_active ? 'bg-green-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${row.is_active ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          <span className={row.is_active ? 'text-green-700' : 'text-slate-500'}>
            {row.is_active ? t('support_visible') : t('support_hidden')}
          </span>
        </button>
      ),
    },
    {
      key: 'actions',
      title: t('actions'),
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            title={t('support_test_link')}
            aria-label={t('support_test_link')}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button type="button" onClick={() => setEditing(row)} title={t('edit')} aria-label={t('edit')} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setToDelete(row)} title={t('delete')} aria-label={t('delete')} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl py-2 md:py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">{t('support_channels')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('support_channels_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/support" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <Eye className="h-4 w-4" />
            {t('support')}
          </Link>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing({})}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" />
              {t('support_add_channel')}
            </button>
          )}
        </div>
      </div>

      {editing && <ChannelForm key={editing.id ?? 'new'} initial={editing.id ? editing : null} onClose={() => setEditing(null)} />}

      <Table columns={columns} data={channels} loading={isLoading} rowKey="id" hoverable={false} emptyMessage={t('support_no_channels_manager')} />

      <ConfirmationModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await deleteChannel(toDelete.id).unwrap();
            toast.success(t('support_deleted'));
          } catch (err) {
            toast.error(showMessageInLanguage(apiErrorMessage(err, 'Could not delete the channel.')));
          }
          setToDelete(null);
        }}
        title={t('support_delete_title')}
        message={t('support_delete_confirm', { label: toDelete?.label ?? '' })}
        confirmText={t('delete')}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
};

export default SupportChannelsPage;
