/**
 * Builds what the support page hands to WhatsApp / Messenger.
 *
 * The app has no messaging of its own: a support channel is someone's WhatsApp number or a
 * Facebook page, and the user's message is sent from their own WhatsApp or Messenger. So the
 * one thing this page can add is context. Every message ends with who sent it (name, role,
 * email, phone), so whoever answers does not have to ask "who is this?" before they can help.
 * The user sees that signature in the preview before anything opens.
 */

/** The user's text, then who they are. Empty lines and missing details are left out. */
export const buildSupportMessage = ({ message, user, t }) => {
  const who = [user?.name, user?.role?.name].filter(Boolean).join(' · ');
  const contact = [user?.email, user?.phone].filter(Boolean).join(' · ');

  const lines = [(message ?? '').trim(), '', '—'];
  if (who) lines.push(who);
  if (contact) lines.push(contact);
  lines.push(t('support_sent_from'));
  return lines.join('\n');
};

/**
 * The link that opens the conversation with the text already typed.
 *
 * WhatsApp's click-to-chat (wa.me) takes the message as `text` and fills it in reliably, on
 * phones (the app opens) and on desktop (WhatsApp Web or the desktop app). Messenger's m.me
 * accepts `text` too, but not every Messenger client honours it, which is why the page also
 * copies the message to the clipboard for Messenger: if it does not appear, it can be pasted.
 */
export const buildChannelUrl = (channel, text) => {
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  if (channel.type === 'whatsapp') return `https://wa.me/${channel.target}${q}`;
  if (channel.type === 'messenger') return `https://m.me/${channel.target}${q}`;
  return channel.link ?? '';
};

/** "+880 1711-000000" for a WhatsApp number, "@page" for Messenger; display only. */
export const displayTarget = (channel) => {
  if (channel.type === 'whatsapp') {
    const d = String(channel.target ?? '');
    return d.startsWith('880') && d.length === 13 ? `+880 ${d.slice(3, 7)}-${d.slice(7)}` : `+${d}`;
  }
  return `@${channel.target}`;
};

export const CHANNEL_STYLE = {
  whatsapp: { name: 'WhatsApp', color: '#25D366', tint: 'bg-[#25D366]/10 text-[#128C7E]', button: 'bg-[#25D366] hover:bg-[#1fb857]' },
  messenger: { name: 'Messenger', color: '#0084FF', tint: 'bg-[#0084FF]/10 text-[#0068cc]', button: 'bg-[#0084FF] hover:bg-[#0075e0]' },
};
