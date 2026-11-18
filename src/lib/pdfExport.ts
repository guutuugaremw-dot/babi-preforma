import { jsPDF } from 'jspdf';
import type {
  InvoiceCalculationSummary,
  ProformaInvoiceDraft,
  StudioSettings,
} from '../types/proforma';
import { formatMoney, formatQty, formatReadableDate } from './calculations';
import { loadCleanSignatureDataUrl } from './signatureAsset';

const STUDIO_LOGO_PATH = '/assets/aistudio/image_97dc7301.png';

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Logo load failed'));
      img.src = STUDIO_LOGO_PATH;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 256;
    canvas.height = img.naturalHeight || 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function exportProformaPdf(
  invoice: ProformaInvoiceDraft,
  summary: InvoiceCalculationSummary,
  studio: StudioSettings
): Promise<void> {
  const [logoDataUrl, signatureAsset] = await Promise.all([
    loadLogoDataUrl(),
    loadCleanSignatureDataUrl(),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  // --- Official Studio Logo Box ---
  doc.setFillColor(33, 37, 43);
  doc.roundedRect(marginX, y, 18, 18, 2, 2, 'F');
  doc.setDrawColor(212, 163, 115);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX, y, 18, 18, 2, 2, 'S');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX + 1, y + 1, 16, 16);
  } else {
    doc.setTextColor(212, 163, 115);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const initial = (studio.brandName || 'B').slice(0, 1).toUpperCase();
    doc.text(initial, marginX + 9, y + 11.5, { align: 'center' });
  }

  // --- Brand Title & Tagline ---
  doc.setTextColor(26, 29, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((studio.brandName || 'BABI').toUpperCase(), marginX + 22, y + 8);

  doc.setTextColor(140, 122, 107);
  doc.setFontSize(8);
  doc.text((studio.tagline || 'INTERIOR DESIGN').toUpperCase(), marginX + 22, y + 13);

  // --- Right Contact Info ---
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(studio.location || '', pageWidth - marginX, y + 4, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.text(studio.phone || '', pageWidth - marginX, y + 8.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  if (studio.messagingNote) {
    doc.text(studio.messagingNote, pageWidth - marginX, y + 12.5, { align: 'right' });
  }
  doc.setTextColor(71, 85, 105);
  doc.text(studio.email || '', pageWidth - marginX, y + 16.5, { align: 'right' });

  y += 23;
  doc.setDrawColor(226, 210, 195);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  // --- Client & Reference Bar ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('To:', marginX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.clientName || 'Valued Client', marginX + 7, y);

  if (invoice.clientPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Phone:', marginX + 62, y);
    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.clientPhone, marginX + 74, y);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ref:', pageWidth - marginX - 52, y);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.referenceNumber, pageWidth - marginX, y, { align: 'right' });

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const subMetaLeft = [invoice.projectTitle, invoice.clientAddress].filter(Boolean).join(' · ');
  if (subMetaLeft) {
    doc.text(subMetaLeft.slice(0, 75), marginX, y);
  }
  doc.text(
    `Issued: ${formatReadableDate(invoice.issueDate)}  |  Valid Until: ${formatReadableDate(invoice.validUntil)}`,
    pageWidth - marginX,
    y,
    { align: 'right' }
  );

  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // --- Title Banner ---
  doc.setFillColor(251, 246, 240);
  doc.setDrawColor(226, 210, 195);
  doc.roundedRect(marginX, y, contentWidth, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 29, 32);
  doc.text('P R O F O R M A   I N V O I C E', pageWidth / 2, y + 6.6, { align: 'center' });
  y += 15;

  // --- Table Header ---
  const colIdxX = marginX;
  const colDescX = marginX + 10;
  const colUnitPriceX = marginX + contentWidth - 62;
  const colQtyX = marginX + contentWidth - 36;
  const colTotalX = marginX + contentWidth - 3;

  const drawTableHeader = () => {
    doc.setFillColor(26, 29, 32);
    doc.rect(marginX, y, contentWidth, 8.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', colIdxX + 5, y + 5.7, { align: 'center' });
    doc.text('Item & Description', colDescX + 2, y + 5.7);
    doc.text('Unit Price', colUnitPriceX, y + 5.7, { align: 'right' });
    doc.text('Qty', colQtyX, y + 5.7, { align: 'center' });
    doc.text('Total', colTotalX, y + 5.7, { align: 'right' });
    y += 10;
  };

  drawTableHeader();

  // --- Table Rows ---
  summary.items.forEach((item, idx) => {
    const descMaxWidth = colUnitPriceX - colDescX - 18;
    const titleLines = doc.splitTextToSize(item.title || 'Custom Item', descMaxWidth) as string[];
    const specParts: string[] = [];
    if (item.specification) specParts.push(item.specification);
    if (item.pricingMode === 'dimension') {
      specParts.push(`${item.width}m x ${item.height}m`);
    }
    const addonLines: string[] = (item.addons || []).map(
      (a) => `+ ${a.name} (${formatMoney(a.price, invoice.currency)})`
    );

    const rowHeight = Math.max(
      14,
      titleLines.length * 4.5 + (specParts.length ? 5 : 0) + addonLines.length * 4 + 6
    );

    if (y + rowHeight > pageHeight - 25) {
      doc.addPage();
      y = 18;
      drawTableHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), colIdxX + 5, y + 4.5, { align: 'center' });

    doc.setTextColor(26, 29, 32);
    doc.text(titleLines, colDescX + 2, y + 4.5);

    let innerY = y + 4.5 + titleLines.length * 4.2;
    if (specParts.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(90, 100, 115);
      doc.text(specParts.join('  ·  '), colDescX + 2, innerY);
      innerY += 4.2;
    }

    if (addonLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 90, 60);
      addonLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, descMaxWidth) as string[];
        doc.text(wrapped, colDescX + 2, innerY);
        innerY += wrapped.length * 3.8;
      });
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(44, 62, 80);
    doc.text(formatMoney(item.unitPrice, invoice.currency), colUnitPriceX, y + 4.5, {
      align: 'right',
    });

    doc.setFont('courier', 'bold');
    doc.setTextColor(26, 29, 32);
    doc.text(
      `${formatQty(item.effectiveQuantity)} ${item.unitLabel || ''}`.trim(),
      colQtyX,
      y + 4.5,
      { align: 'center' }
    );

    doc.text(formatMoney(item.lineTotal, invoice.currency), colTotalX, y + 4.5, {
      align: 'right',
    });

    y += rowHeight;
    doc.setDrawColor(238, 238, 238);
    doc.setLineWidth(0.25);
    doc.line(marginX, y - 2, pageWidth - marginX, y - 2);
  });

  // --- Totals Section ---
  ensureSpace(44);
  y += 4;
  const totalsWidth = 78;
  const totalsX = pageWidth - marginX - totalsWidth;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text('SUBTOTAL', totalsX, y);
  doc.setFont('courier', 'bold');
  doc.text(formatMoney(summary.subtotal, invoice.currency), pageWidth - marginX, y, {
    align: 'right',
  });
  y += 6;

  if (invoice.taxRate > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(85, 85, 85);
    doc.text(`TAX / VAT (${invoice.taxRate}%)`, totalsX, y);
    doc.setFont('courier', 'bold');
    doc.text(formatMoney(summary.taxAmount, invoice.currency), pageWidth - marginX, y, {
      align: 'right',
    });
    y += 6;
  }

  doc.setDrawColor(176, 137, 104);
  doc.setLineWidth(0.6);
  doc.line(totalsX, y - 1, pageWidth - marginX, y - 1);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(176, 137, 104);
  doc.text('TOTAL', totalsX, y);
  doc.setFont('courier', 'bold');
  doc.text(formatMoney(summary.grandTotal, invoice.currency), pageWidth - marginX, y, {
    align: 'right',
  });
  y += 6;

  if (invoice.prepaymentPercent > 0) {
    doc.setFillColor(251, 246, 240);
    doc.setDrawColor(226, 210, 195);
    doc.setLineWidth(0.35);
    doc.roundedRect(totalsX - 2, y - 1, totalsWidth + 2, 8.5, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 29, 32);
    doc.text(`${invoice.prepaymentPercent}% PREPAYMENT`, totalsX + 1, y + 4.7);
    doc.setFont('courier', 'bold');
    doc.setTextColor(120, 53, 15);
    doc.text(formatMoney(summary.prepaymentAmount, invoice.currency), pageWidth - marginX - 1.5, y + 4.7, {
      align: 'right',
    });
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(100, 116, 139);
    doc.text('BALANCE UPON COMPLETION', totalsX, y);
    doc.setFont('courier', 'bold');
    doc.text(formatMoney(summary.balanceDue, invoice.currency), pageWidth - marginX, y, {
      align: 'right',
    });
    y += 8;
  }

  // --- Payment Terms & Banking Details ---
  ensureSpace(36);
  y += 3;
  doc.setDrawColor(238, 238, 238);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  if (invoice.paymentTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 29, 32);
    doc.text('Payment Terms & Validity:', marginX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    const termLines = doc.splitTextToSize(invoice.paymentTerms, contentWidth) as string[];
    doc.text(termLines, marginX, y);
    y += termLines.length * 3.8 + 4;
  }

  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 29, 32);
  doc.text('Bank Transfer Details:', marginX, y);
  doc.text('Project Execution:', pageWidth - marginX, y, { align: 'right' });
  y += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);
  if (studio.bankLabel || studio.bankAccount) {
    doc.text(`${studio.bankLabel}: ${studio.bankAccount}`, marginX, y);
  }
  if (studio.executionLocation) {
    doc.text(`Location: ${studio.executionLocation}`, pageWidth - marginX, y, {
      align: 'right',
    });
  }
  y += 4;
  if (studio.mobileMoneyLabel || studio.mobileMoneyAccount) {
    doc.text(`${studio.mobileMoneyLabel}: ${studio.mobileMoneyAccount}`, marginX, y);
  }
  if (studio.warrantyNote) {
    doc.text(studio.warrantyNote, pageWidth - marginX, y, { align: 'right' });
  }

  // --- Authorized Signature Block ---
  y += 10;
  ensureSpace(28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared & Approved By', marginX, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 29, 32);
  doc.text(
    `${(studio.brandName || 'BABI').toUpperCase()} ${(studio.tagline || 'INTERIOR DESIGN').toUpperCase()}`,
    marginX,
    y + 10.5
  );

  if (signatureAsset) {
    const sigHeightMm = 12;
    const sigWidthMm = Math.min(40, Math.max(16, sigHeightMm * signatureAsset.aspectRatio));
    doc.addImage(
      signatureAsset.dataUrl,
      'PNG',
      pageWidth - marginX - sigWidthMm,
      y - 1,
      sigWidthMm,
      sigHeightMm
    );
  }
  const sigLineY = y + 12;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(pageWidth - marginX - 44, sigLineY, pageWidth - marginX, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 29, 32);
  doc.text('Authorized Signature', pageWidth - marginX, sigLineY + 4, { align: 'right' });

  y = sigLineY + 10;
  ensureSpace(12);
  doc.setDrawColor(226, 210, 195);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(140, 122, 107);
  doc.text(
    (studio.footerNote || 'THANK YOU FOR YOUR BUSINESS').toUpperCase(),
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  const safeClient = (invoice.clientName || 'Client').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const fileName = `Proforma_${invoice.referenceNumber}_${safeClient}.pdf`;
  doc.save(fileName);
}
