import 'server-only';
import PDFDocument from 'pdfkit';
import { formatDate } from '@/lib/format';
import type { QuoteDetail } from '@/lib/quotes/repo';
import type { CompanySettings, Workspace } from '@/lib/types';

/**
 * Renders a quote as a clean, single-accent A4 proposal with pdfkit's
 * built-in Helvetica (no font files to ship). Money is formatted with a
 * currency code rather than a symbol because the standard PDF fonts lack ₪.
 */

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const INK = '#111318';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

function money(amount: number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** `premium_paint` → `Premium paint`, for option keys shown to a customer. */
function humanise(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [37, 99, 235];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface QuotePdfInput {
  quote: QuoteDetail;
  workspace: Workspace;
  settings: CompanySettings;
  logo: Buffer | null;
  publicUrl: string;
}

export function renderQuotePdf({ quote, workspace, settings, logo, publicUrl }: QuotePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, info: { Title: `${quote.quote_number} — ${workspace.name}`, Author: workspace.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = hexToRgb(workspace.brand_color);
    const contentWidth = PAGE.width - PAGE.margin * 2;
    const right = PAGE.width - PAGE.margin;

    // Brand bar
    doc.rect(0, 0, PAGE.width, 6).fill(brand);

    // Header: logo / company + quote meta
    let y = PAGE.margin;
    let logoDrawn = false;
    if (logo) {
      try {
        doc.image(logo, PAGE.margin, y, { fit: [120, 44] });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(workspace.name, PAGE.margin, y + 6);
    }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text('QUOTE', PAGE.margin, y, { width: contentWidth, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    doc.text(quote.quote_number, PAGE.margin, y + 26, { width: contentWidth, align: 'right' });
    doc.text(`Issued ${formatDate(quote.created_at)}`, PAGE.margin, y + 40, { width: contentWidth, align: 'right' });
    if (quote.expires_at) doc.text(`Valid until ${formatDate(quote.expires_at)}`, PAGE.margin, y + 54, { width: contentWidth, align: 'right' });

    y += 84;
    doc.moveTo(PAGE.margin, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 18;

    // Parties
    const col = contentWidth / 2;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('FROM', PAGE.margin, y);
    doc.text('PREPARED FOR', PAGE.margin + col, y);
    y += 14;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(workspace.name, PAGE.margin, y, { width: col - 16 });
    doc.text(quote.customer_name ?? 'Customer', PAGE.margin + col, y, { width: col });
    y = doc.y + 2;
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED);
    const fromLines = [workspace.business_type, workspace.service_area, workspace.phone, workspace.email].filter(Boolean) as string[];
    const toLines = [quote.customer_phone, quote.customer_email, quote.pricing_snapshot?.input?.location ? `Project location: ${quote.pricing_snapshot.input.location}` : null].filter(Boolean) as string[];
    const startY = y;
    fromLines.forEach((line, i) => doc.text(line, PAGE.margin, startY + i * 13, { width: col - 16 }));
    toLines.forEach((line, i) => doc.text(line, PAGE.margin + col, startY + i * 13, { width: col }));
    y = startY + Math.max(fromLines.length, toLines.length) * 13 + 22;

    // Project summary
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PROJECT', PAGE.margin, y);
    y += 14;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(quote.service_name ?? 'Service', PAGE.margin, y, { width: contentWidth });
    y = doc.y + 4;
    if (quote.project_summary) {
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(quote.project_summary, PAGE.margin, y, { width: contentWidth, lineGap: 2 });
      y = doc.y + 6;
    }
    const inp = quote.pricing_snapshot?.input;
    if (inp) {
      const facts = [
        inp.quantity && inp.unit ? `${inp.quantity} ${inp.unit}` : null,
        inp.urgency === 'urgent' ? 'Urgent' : 'Standard timing',
        inp.options?.length ? `Extras: ${inp.options.map(humanise).join(', ')}` : null,
      ].filter(Boolean);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(facts.join('   ·   '), PAGE.margin, y);
      y = doc.y + 4;
    }
    y += 14;

    // Breakdown table
    const cols = { item: PAGE.margin, qty: PAGE.margin + contentWidth * 0.58, unit: PAGE.margin + contentWidth * 0.74, amount: right };
    doc.rect(PAGE.margin, y, contentWidth, 22).fill('#f5f5f4');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    doc.text('DESCRIPTION', cols.item + 8, y + 7);
    doc.text('QTY', cols.qty, y + 7, { width: 60, align: 'right' });
    doc.text('UNIT', cols.unit, y + 7, { width: 60, align: 'right' });
    doc.text('AMOUNT', cols.unit + 70, y + 7, { width: cols.amount - cols.unit - 78, align: 'right' });
    y += 22;

    for (const it of quote.items) {
      const rowTop = y;
      doc.font(it.kind === 'base' ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(INK).text(it.label, cols.item + 8, y + 8, { width: cols.qty - cols.item - 16 });
      let rowH = doc.y - rowTop + 4;
      if (it.description) {
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(it.description, cols.item + 8, doc.y + 1, { width: cols.qty - cols.item - 16 });
        rowH = doc.y - rowTop + 6;
      }
      doc.font('Helvetica').fontSize(10).fillColor(INK);
      doc.text(it.quantity != null ? String(it.quantity) : '—', cols.qty, rowTop + 8, { width: 60, align: 'right' });
      doc.text(it.unit_amount != null ? money(it.unit_amount, quote.currency) : '—', cols.unit, rowTop + 8, { width: 60, align: 'right' });
      doc.text(money(it.amount, quote.currency), cols.unit + 70, rowTop + 8, { width: cols.amount - cols.unit - 78, align: 'right' });
      y = rowTop + Math.max(rowH, 26);
      doc.moveTo(PAGE.margin, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.5).stroke();
      if (y > PAGE.height - 200) {
        doc.addPage();
        y = PAGE.margin;
      }
    }

    // Totals
    y += 10;
    const totalsX = PAGE.margin + contentWidth * 0.55;
    const totalsW = right - totalsX;
    const line = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(bold ? INK : MUTED);
      doc.text(label, totalsX, y, { width: totalsW * 0.55 });
      doc.text(value, totalsX + totalsW * 0.45, y, { width: totalsW * 0.55, align: 'right' });
      y += bold ? 22 : 16;
    };
    line('Subtotal', money(quote.subtotal, quote.currency));
    line('Modifiers & surcharges', money(quote.modifiers_total, quote.currency));
    doc.moveTo(totalsX, y).lineTo(right, y).strokeColor(brand).lineWidth(1.2).stroke();
    y += 8;
    line('Estimated total', money(quote.total, quote.currency), true);

    // Notes
    y += 10;
    if (quote.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('NOTES', PAGE.margin, y);
      y += 13;
      doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(quote.notes, PAGE.margin, y, { width: contentWidth, lineGap: 2 });
      y = doc.y + 12;
    }
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`Review, accept or decline this quote online: ${publicUrl}`, PAGE.margin, y, { width: contentWidth });

    // Footer — kept inside the printable area so pdfkit never spills it onto a new page.
    const footerY = PAGE.height - PAGE.margin - 12;
    doc.moveTo(PAGE.margin, footerY - 8).lineTo(right, footerY - 8).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text(`${workspace.name}${workspace.phone ? ` · ${workspace.phone}` : ''}${workspace.email ? ` · ${workspace.email}` : ''}`, PAGE.margin, footerY, { width: contentWidth * 0.7, lineBreak: false });
    doc.text(`Valid ${settings.default_quote_expiry_days} days unless stated otherwise`, PAGE.margin, footerY, { width: contentWidth, align: 'right', lineBreak: false });

    doc.end();
  });
}
