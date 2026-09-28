import 'server-only';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { formatDate } from '@/lib/format';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import type { QuoteDetail } from '@/lib/quotes/repo';
import type { CompanySettings, Workspace } from '@/lib/types';

/**
 * Renders a quote as a clean, single-accent A4 proposal.
 *
 * English uses pdfkit's built-in Helvetica. Arabic embeds Noto Naskh Arabic
 * (OFL, in ./fonts) and mirrors the whole page: pdfkit shapes Arabic and keeps
 * mixed Arabic/Latin runs — prices, quote numbers, dates — in the right order,
 * but it does not mirror paired brackets, which is why the Arabic copy avoids
 * them.
 *
 * Money is formatted with a currency code rather than a symbol because the
 * standard PDF fonts lack ₪.
 */

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const INK = '#111318';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const ARABIC_FONT = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'NotoNaskhArabic-Regular.ttf');

function money(amount: number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [37, 99, 235];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const SUPERSCRIPT: Record<string, string> = { '²': '2', '³': '3', '¹': '1' };

/**
 * Noto Naskh Arabic has no superscript digits, and pdfkit does not fall back
 * to another face, so "م²" would print a tofu box. Units are company-entered
 * text, so normalise them rather than restricting what a company may type.
 */
function forFont(text: string, rtl: boolean): string {
  return rtl ? text.replace(/[²³¹]/g, (ch) => SUPERSCRIPT[ch] ?? ch) : text;
}

/** `premium_paint` → `Premium paint`, for option keys shown to a customer. */
function humanise(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface QuotePdfInput {
  quote: QuoteDetail;
  workspace: Workspace;
  settings: CompanySettings;
  logo: Buffer | null;
  publicUrl: string;
  dict: Dictionary;
  locale: Locale;
}

export function renderQuotePdf({ quote, workspace, settings, logo, publicUrl, dict: d, locale }: QuotePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const rtl = locale === 'ar';
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      info: { Title: `${quote.quote_number} — ${workspace.name}`, Author: workspace.name },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Noto Naskh carries Latin as well, so a mixed Arabic line stays in one face.
    if (rtl) doc.registerFont('body', ARABIC_FONT);
    const regular = rtl ? 'body' : 'Helvetica';
    const bold = rtl ? 'body' : 'Helvetica-Bold';

    /**
     * Every string on the page goes through here.
     *
     * pdfkit splits on spaces before handing text to the shaper, and for a
     * right-to-left run that loses the inter-word space and scrambles the word
     * order. Joining the words of a line with a no-break space hands the
     * shaper one run, which it lays out correctly — so the wrapping has to
     * happen here rather than inside pdfkit.
     */
    const NBSP = '\u00A0';
    const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    /** Join two words with a no-break space only when both are Arabic. */
    const joiner = (left: string, right: string) => (ARABIC.test(left) && ARABIC.test(right) ? NBSP : ' ');
    const joinWords = (words: string[]) =>
      words.reduce((acc, word, i) => (i === 0 ? word : acc + joiner(words[i - 1], word) + word), '');

    const wrapRtl = (text: string, width: number): string =>
      text
        .split('\n')
        .flatMap((paragraph) => {
          const words = paragraph.split(/\s+/).filter(Boolean);
          const lines: string[] = [];
          let current: string[] = [];
          for (const word of words) {
            if (current.length && doc.widthOfString(joinWords([...current, word])) > width) {
              lines.push(joinWords(current));
              current = [word];
            } else {
              current.push(word);
            }
          }
          if (current.length) lines.push(joinWords(current));
          return lines;
        })
        .join('\n');

    const T = (text: string, ...rest: unknown[]) => {
      let prepared = forFont(text, rtl);
      const options = rest[2] as { width?: number; lineBreak?: boolean } | undefined;
      if (rtl && options?.width) {
        prepared = wrapRtl(prepared, options.width);
        // The lines are already measured, and pdfkit's own wrapper would split
        // on the no-break spaces again — so it must not re-wrap them.
        rest[2] = { ...options, lineBreak: false };
      }
      return (doc.text as (t: string, ...r: unknown[]) => typeof doc)(prepared, ...rest);
    };

    const brand = hexToRgb(workspace.brand_color);
    const contentWidth = PAGE.width - PAGE.margin * 2;
    const right = PAGE.width - PAGE.margin;
    const startAlign = (rtl ? 'right' : 'left') as 'left' | 'right';
    const endAlign = (rtl ? 'left' : 'right') as 'left' | 'right';
    /** Mirror a box inside the content area, so the layout flips as a whole. */
    const mx = (x: number, w: number) => (rtl ? PAGE.margin + (contentWidth - (x - PAGE.margin) - w) : x);

    // Brand bar
    doc.rect(0, 0, PAGE.width, 6).fill(brand);

    // Header: logo / company on the start side, quote meta on the end side
    let y = PAGE.margin;
    let logoDrawn = false;
    if (logo) {
      try {
        doc.image(logo, mx(PAGE.margin, 120), y, { fit: [120, 44] });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      doc.fillColor(INK).font(bold).fontSize(18);
      T(workspace.name, PAGE.margin, y + 6, { width: contentWidth, align: startAlign });
    }
    doc.fillColor(INK).font(bold).fontSize(20);
    T(d.pdf.quote, PAGE.margin, y, { width: contentWidth, align: endAlign });
    doc.font(regular).fontSize(10).fillColor(MUTED);
    T(quote.quote_number, PAGE.margin, y + 26, { width: contentWidth, align: endAlign });
    T(fill(d.pdf.issued, { date: formatDate(quote.created_at, locale) }), PAGE.margin, y + 40, { width: contentWidth, align: endAlign });
    if (quote.expires_at) {
      T(fill(d.pdf.validUntil, { date: formatDate(quote.expires_at, locale) }), PAGE.margin, y + 54, { width: contentWidth, align: endAlign });
    }

    y += 84;
    doc.moveTo(PAGE.margin, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 18;

    // Parties
    const col = contentWidth / 2;
    const fromX = mx(PAGE.margin, col - 16);
    const toX = mx(PAGE.margin + col, col);
    doc.font(bold).fontSize(8).fillColor(MUTED);
    T(d.pdf.from, fromX, y, { width: col - 16, align: startAlign });
    T(d.pdf.preparedFor, toX, y, { width: col, align: startAlign });
    y += 14;
    doc.font(bold).fontSize(11).fillColor(INK);
    T(workspace.name, fromX, y, { width: col - 16, align: startAlign });
    T(quote.customer_name ?? d.pdf.customer, toX, y, { width: col, align: startAlign });
    y = doc.y + 2;
    doc.font(regular).fontSize(9.5).fillColor(MUTED);
    const fromLines = [workspace.business_type, workspace.service_area, workspace.phone, workspace.email].filter(Boolean) as string[];
    const toLines = [
      quote.customer_phone,
      quote.customer_email,
      quote.pricing_snapshot?.input?.location ? fill(d.pdf.projectLocation, { location: quote.pricing_snapshot.input.location }) : null,
    ].filter(Boolean) as string[];
    const startY = y;
    fromLines.forEach((line, i) => T(line, fromX, startY + i * 13, { width: col - 16, align: startAlign }));
    toLines.forEach((line, i) => T(line, toX, startY + i * 13, { width: col, align: startAlign }));
    y = startY + Math.max(fromLines.length, toLines.length) * 13 + 22;

    // Project summary
    doc.font(bold).fontSize(8).fillColor(MUTED);
    T(d.pdf.project, PAGE.margin, y, { width: contentWidth, align: startAlign });
    y += 14;
    doc.font(bold).fontSize(12).fillColor(INK);
    T(quote.service_name ?? d.pdf.service, PAGE.margin, y, { width: contentWidth, align: startAlign });
    y = doc.y + 4;
    if (quote.project_summary) {
      doc.font(regular).fontSize(10).fillColor(INK);
      T(quote.project_summary, PAGE.margin, y, { width: contentWidth, lineGap: 2, align: startAlign });
      y = doc.y + 6;
    }
    const inp = quote.pricing_snapshot?.input;
    if (inp) {
      const facts = [
        inp.quantity && inp.unit ? `${inp.quantity} ${inp.unit}` : null,
        inp.urgency === 'urgent' ? d.pdf.urgent : d.pdf.standardTiming,
        inp.options?.length ? fill(d.pdf.extras, { options: inp.options.map(humanise).join(rtl ? '، ' : ', ') }) : null,
      ].filter(Boolean);
      doc.font(regular).fontSize(9).fillColor(MUTED);
      T(facts.join('   ·   '), PAGE.margin, y, { width: contentWidth, align: startAlign });
      y = doc.y + 4;
    }
    y += 14;

    // Breakdown table — column boxes are mirrored as a set
    const descW = contentWidth * 0.56;
    const numW = 72;
    const descX = mx(PAGE.margin + 8, descW);
    const qtyX = mx(PAGE.margin + contentWidth * 0.58, numW);
    const unitX = mx(PAGE.margin + contentWidth * 0.72, numW);
    const amountX = mx(PAGE.margin + contentWidth * 0.86 - 8, numW + 8);

    doc.rect(PAGE.margin, y, contentWidth, 22).fill('#f5f5f4');
    doc.font(bold).fontSize(8).fillColor(MUTED);
    T(d.pdf.description, descX, y + 7, { width: descW, align: startAlign });
    T(d.pdf.qty, qtyX, y + 7, { width: numW, align: endAlign });
    T(d.pdf.unit, unitX, y + 7, { width: numW, align: endAlign });
    T(d.pdf.amount, amountX, y + 7, { width: numW + 8, align: endAlign });
    y += 22;

    for (const it of quote.items) {
      const rowTop = y;
      doc.font(it.kind === 'base' ? bold : regular).fontSize(10).fillColor(INK);
      T(it.label, descX, y + 8, { width: descW, align: startAlign });
      let rowH = doc.y - rowTop + 4;
      if (it.description) {
        doc.font(regular).fontSize(8.5).fillColor(MUTED);
        T(it.description, descX, doc.y + 1, { width: descW, align: startAlign });
        rowH = doc.y - rowTop + 6;
      }
      doc.font(regular).fontSize(10).fillColor(INK);
      T(it.quantity != null ? String(it.quantity) : '—', qtyX, rowTop + 8, { width: numW, align: endAlign });
      T(it.unit_amount != null ? money(it.unit_amount, quote.currency) : '—', unitX, rowTop + 8, { width: numW, align: endAlign });
      T(money(it.amount, quote.currency), amountX, rowTop + 8, { width: numW + 8, align: endAlign });
      y = rowTop + Math.max(rowH, 26);
      doc.moveTo(PAGE.margin, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.5).stroke();
      if (y > PAGE.height - 200) {
        doc.addPage();
        y = PAGE.margin;
      }
    }

    // Totals
    y += 10;
    const totalsW = contentWidth * 0.45;
    const totalsX = mx(PAGE.margin + contentWidth * 0.55, totalsW);
    const line = (label: string, value: string, isTotal = false) => {
      doc.font(isTotal ? bold : regular).fontSize(isTotal ? 12 : 10).fillColor(isTotal ? INK : MUTED);
      T(label, totalsX, y, { width: totalsW, align: startAlign, lineBreak: false });
      T(value, totalsX, y, { width: totalsW, align: endAlign, lineBreak: false });
      y += isTotal ? 22 : 16;
    };
    line(d.pdf.subtotal, money(quote.subtotal, quote.currency));
    line(d.pdf.modifiers, money(quote.modifiers_total, quote.currency));
    doc.moveTo(totalsX, y).lineTo(totalsX + totalsW, y).strokeColor(brand).lineWidth(1.2).stroke();
    y += 8;
    line(d.pdf.estimatedTotal, money(quote.total, quote.currency), true);

    // Notes
    y += 10;
    if (quote.notes) {
      doc.font(bold).fontSize(8).fillColor(MUTED);
      T(d.pdf.notes, PAGE.margin, y, { width: contentWidth, align: startAlign });
      y += 13;
      doc.font(regular).fontSize(9.5).fillColor(INK);
      T(quote.notes, PAGE.margin, y, { width: contentWidth, lineGap: 2, align: startAlign });
      y = doc.y + 12;
    }
    doc.font(regular).fontSize(9).fillColor(MUTED);
    T(fill(d.pdf.reviewOnline, { url: publicUrl }), PAGE.margin, y, { width: contentWidth, align: startAlign });

    // Footer — measured against the font's own line height, because the Arabic
    // face is considerably taller than Helvetica and would otherwise cross the
    // bottom margin and make pdfkit start a new page.
    doc.font(regular).fontSize(8);
    const footerY = PAGE.height - PAGE.margin - doc.currentLineHeight() - 2;
    doc.moveTo(PAGE.margin, footerY - 8).lineTo(right, footerY - 8).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.fillColor(MUTED);
    T(`${workspace.name}${workspace.phone ? ` · ${workspace.phone}` : ''}${workspace.email ? ` · ${workspace.email}` : ''}`, PAGE.margin, footerY, {
      width: contentWidth * 0.7,
      align: startAlign,
      lineBreak: false,
    });
    T(fill(d.pdf.validDays, { n: settings.default_quote_expiry_days }), PAGE.margin, footerY, { width: contentWidth, align: endAlign, lineBreak: false });

    doc.end();
  });
}
