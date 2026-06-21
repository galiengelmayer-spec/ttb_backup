import { Linking } from 'react-native';

// Converts a local Israeli phone (e.g. "050-3847291") into a wa.me deep link.
export function toWhatsAppLink(phone, message) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(phone, message) {
  const link = toWhatsAppLink(phone, message);
  if (link) await Linking.openURL(link);
}

export const DEFAULT_REMINDER_TEMPLATE = 'שלום, היום זה היה השיעור האחרון בכרטיסיה';

export const DEFAULT_CLOSURE_TEMPLATE =
  'שלום! הסטודיו יהיה סגור בתאריכים {תאריכים}. נתראה בקרוב 💜';
