/**
 * Build a mailto: link that opens the user's email client pre-filled.
 * Like buildSmsLink - nothing is sent automatically, the user reviews and sends.
 */
export function buildMailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
