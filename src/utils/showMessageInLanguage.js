import i18n from '../i18n';

/**
 * Returns the message in the current language when format is "en||bn".
 * @param {string} message - Message in format "english||bangla" or plain string
 * @returns {string} Message in current language, or original if no split, or empty string if falsy
 */
export const showMessageInLanguage = (message) => {
  console.log(message);
  if (message == null || typeof message !== 'string') {
    return '';
  }
  const lang = i18n.language || 'en';
  const isBengali = String(lang).toLowerCase().startsWith('bn');
  if (message.includes('||')) {
    const parts = message.split('||');
    return (isBengali ? parts[1] : parts[0])?.trim() || message;
  }
  return message;
};