import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { money } from "@/lib/format";

export type PdfLine = { name: string; description?: string | null; quantity?: number; total?: number };

export type PdfBrand = {
  companyName: string;
  tagline?: string | null;
  color?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

function cleanText(value: unknown) {
  // Strip HTML tags from rich text editor output, then clean whitespace
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export type PdfImageGroup = {
  heading: string;
  images: Array<{ url: string; caption?: string | null }>;
};

/** Callers may supply an authorized resolver; the default only handles absolute external URLs. */
export type PdfImageResolver = (url: string) => Promise<Buffer | null>;

/** How many requested images actually reached the document, and which ones did not. */
export type PdfImageReport = { requested: number; embedded: number; skipped: string[] };

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

export async function buildDocument(input: {
  title: string;
  number?: string;
  client?: string | null;
  property?: string | null;
  sections: Array<{ heading: string; body?: string | null; lines?: PdfLine[] }>;
  imageGroups?: PdfImageGroup[];
  resolveImage?: PdfImageResolver;
  imageReport?: PdfImageReport;
  totals?: Array<{ label: string; value: number }>;
  terms?: string | null;
  brand?: PdfBrand;
}) {
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const loadImage = input.resolveImage ?? fetchImageBuffer;

  const brand = input.brand;
  const brandColor = brand?.color ?? "#16231f";
  const companyName = brand?.companyName ?? "Command Center";
  const tagline = brand?.tagline ?? "Renovation operations from lead to closeout";

  // Header band
  const HEADER_H = 68;
  doc.rect(48, 48, doc.page.width - 96, HEADER_H).fill(brandColor);

  // Try to render the logo; fall back to text-only header
  const logoBuffer = brand?.logoUrl ? await loadImage(brand.logoUrl) : null;
  if (logoBuffer) {
    // Logo on left, company info on right
    const logoMaxW = 180;
    const logoMaxH = 44;
    try {
      doc.image(logoBuffer, 60, 50, { fit: [logoMaxW, logoMaxH] });
    } catch {
      // If logo renders error, fall through to text
    }
    const textX = 60 + logoMaxW + 12;
    doc.fontSize(11).fillColor("#ffffff").text(companyName, textX, 57, { continued: false, width: doc.page.width - 96 - textX });
    doc.fontSize(7.5).fillColor("rgba(255,255,255,0.65)").text(tagline, textX, 72, { width: doc.page.width - 96 - textX });
  } else {
    // Text-only header
    doc.fontSize(14).fillColor("#ffffff").text(companyName, 60, 60, { continued: false });
    doc.fontSize(8).fillColor("rgba(255,255,255,0.7)").text(tagline, 60, 79);
  }
  doc.moveDown(3.8);

  // Document title block
  doc.fontSize(22).fillColor(brandColor).text(cleanText(input.title));
  if (input.number) doc.fontSize(10).fillColor("#64748b").text(cleanText(input.number));
  doc.moveDown(0.5);

  // Meta row
  doc.fontSize(10).fillColor("#0f172a").text(`Generated: ${format(new Date(), "PPP")}`);
  if (input.client) doc.text(`Client: ${cleanText(input.client)}`);
  if (input.property) doc.text(`Property: ${cleanText(input.property)}`);

  // Company contact line
  const contactParts = [brand?.address, brand?.phone, brand?.email, brand?.website].filter(Boolean);
  if (contactParts.length) {
    doc.fontSize(8).fillColor("#94a3b8").text(contactParts.join("  ·  "));
  }

  doc.moveDown();

  // Divider
  doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).strokeColor(brandColor).lineWidth(1.5).stroke();
  doc.moveDown(0.5);

  // Sections
  input.sections.forEach((section) => {
    doc.fontSize(13).fillColor(brandColor).text(cleanText(section.heading));
    if (section.body) {
      doc.moveDown(0.3).fontSize(10).fillColor("#334155").text(cleanText(section.body), { lineGap: 3 });
    }
    if (section.lines?.length) {
      doc.moveDown(0.4);
      section.lines.forEach((line) => {
        doc.fontSize(10).fillColor("#0f172a").text(cleanText(line.name), { continued: true });
        doc.text(line.total ? money(line.total) : "", { align: "right" });
        if (line.description) doc.fontSize(8).fillColor("#64748b").text(cleanText(line.description), { indent: 12 });
      });
    }
    doc.moveDown();
  });

  // Totals
  if (input.totals?.length) {
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.5);
    input.totals.forEach((total) => {
      doc.fontSize(11).fillColor("#0f172a").text(total.label, { continued: true });
      doc.fontSize(11).text(money(total.value), { align: "right" });
    });
  }

  // Image groups (before/during/after gallery sections)
  if (input.imageGroups?.length) {
    for (const group of input.imageGroups) {
      doc.addPage();
      doc.fontSize(13).fillColor(brandColor).text(cleanText(group.heading));
      doc.moveDown(0.5);

      const imgW = (doc.page.width - 96 - 16) / 2; // 2-column grid
      const imgH = 160;
      let col = 0;
      let rowX = 48;
      let rowY = doc.y;

      for (const img of group.images) {
        if (input.imageReport) input.imageReport.requested += 1;
        const buf = await loadImage(img.url);
        let embedded = false;
        if (buf) {
          try {
            // `cover` scales the image to cover the cell but does not clip it, and passing
            // width/height as well made tall photos run past the cell into their caption and the
            // next row. Clip to the cell so every photo occupies exactly one grid slot.
            doc.save();
            doc.rect(rowX + col * (imgW + 16), rowY, imgW, imgH).clip();
            doc.image(buf, rowX + col * (imgW + 16), rowY, { cover: [imgW, imgH] });
            doc.restore();
            embedded = true;
            if (img.caption) {
              doc.fontSize(7).fillColor("#64748b").text(cleanText(img.caption), rowX + col * (imgW + 16), rowY + imgH + 4, { width: imgW });
            }
          } catch {
            // Skip images that fail to render
          }
        }
        if (input.imageReport) {
          if (embedded) input.imageReport.embedded += 1;
          else input.imageReport.skipped.push(img.url);
        }
        col++;
        if (col >= 2) {
          col = 0;
          rowY += imgH + 34;
          if (rowY + imgH > doc.page.height - 60) {
            doc.addPage();
            rowY = 48;
          }
        }
      }
      doc.moveDown(3);
    }
  }

  // Terms / footer
  if (input.terms) {
    doc.moveDown(1.5).fontSize(9).fillColor("#94a3b8").text(cleanText(input.terms), { lineGap: 3 });
  }

  // Honest coverage note: never let a missing photo look like a photo that was never taken.
  const report = input.imageReport;
  if (report && report.skipped.length) {
    doc.moveDown(1).fontSize(8).fillColor("#b45309").text(
      `${report.skipped.length} of ${report.requested} requested photos could not be embedded in this export. The photo record still exists in the project gallery.`,
      { lineGap: 2 }
    );
  }

  // Footer brand line
  const footerY = doc.page.height - 48;
  doc.fontSize(7).fillColor("#cbd5e1").text(`${companyName}  ·  ${format(new Date(), "PPP")}`, 48, footerY, { align: "center", width: doc.page.width - 96 });

  doc.end();
  return done;
}
