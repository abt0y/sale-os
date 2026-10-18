import type { Lead } from '@/domain/types';
import { formatDate } from '@/domain/calculations';

export interface WhatsAppDraft {
  text: string;
  url: string | null;
  error?: string;
}

export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return null;
  if (!/^\+?\d{8,15}$/.test(cleaned)) return null;
  return cleaned.replace(/^\+/, '');
}

export function buildWhatsAppDraft(
  lead: Lead,
  phone: string,
  agentName: string,
  locale: string = 'en',
): WhatsAppDraft {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { text: '', url: null, error: 'Invalid phone number' };
  }
  const greeting = locale === 'vi' ? 'Chào' : 'Hello';
  const lines = locale === 'vi'
    ? [
        `${greeting} ${lead.clientName},`,
        '',
        `Cảm ơn anh/chị đã quan tâm đến tour ${lead.destination} (${lead.partySize} khách).`,
        lead.quoteExpiryDate ? `Báo giá có hiệu lực đến ${formatDate(lead.quoteExpiryDate, locale)}.` : '',
        'Em là ' + agentName + ' từ Phúc Gia Travel, xin hỗ trợ anh/chị bất cứ câu hỏi nào.',
        '',
        'Trân trọng,',
        agentName,
        'Phúc Gia Travel',
      ]
    : [
        `${greeting} ${lead.clientName},`,
        '',
        `Thank you for your interest in the ${lead.destination} trip (${lead.partySize} guests).`,
        lead.quoteExpiryDate ? `Your quote is valid until ${formatDate(lead.quoteExpiryDate, locale)}.` : '',
        `I'm ${agentName} from Phúc Gia Travel — happy to help with any questions.`,
        '',
        'Best regards,',
        agentName,
        'Phúc Gia Travel',
      ];
  const text = lines.filter(Boolean).join('\n');
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  return { text, url };
}
