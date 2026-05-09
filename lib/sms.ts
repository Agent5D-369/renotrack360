/**
 * Build an SMS deep link that opens the native SMS app pre-filled with a message.
 * Works on iOS (8+) and modern Android.
 */
export function buildSmsLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `sms:${cleaned}?body=${encodeURIComponent(message)}`;
}
