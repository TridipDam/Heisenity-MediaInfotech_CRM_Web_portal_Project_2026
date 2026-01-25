import * as bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';
import * as fs from 'fs-extra';
import * as path from 'path';
import { prisma } from '../lib/prisma';

interface LabelRenderItem {
  png: Buffer;
  barcodeString: string;
  sku: string;
  productName: string;
  boxQty: number;
}

const OUTPUT_DIR = path.join(process.cwd(), 'output');

function zeroPad(num: number, width = 6) {
  return String(num).padStart(width, '0');
}

async function renderBarcodePng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 10,
    includetext: false
  });
}

async function createPdfFromLabels(
  labels: {
    png: Buffer;
    barcodeString: string;
    sku: string;
    productName: string;
    boxQty: number;
  }[],
  fileName: string
) {
  await fs.ensureDir(OUTPUT_DIR);
  const pdfPath = path.join(OUTPUT_DIR, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  doc.pipe(fs.createWriteStream(pdfPath));

  const columns = 3;
  const gutter = 12;
  const labelHeight = 110;

  const pageWidth = doc.page.width - 72;
  const colWidth = (pageWidth - (columns - 1) * gutter) / columns;

  let x = 36;
  let y = 36;

  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];

    doc.image(l.png, x + 6, y + 6, { fit: [colWidth - 12, 48] });

    let textY = y + 60;
    doc.fontSize(9).text(`SKU: ${l.sku}`, x + 6, textY);
    doc.text(`Product: ${l.productName}`);
    doc.text(`Box Qty: ${l.boxQty}`);
    doc.fontSize(10).text(`Serial: ${l.barcodeString}`);

    if ((i + 1) % columns === 0) {
      x = 36;
      y += labelHeight;
      if (y + labelHeight > doc.page.height - 36) {
        doc.addPage();
        y = 36;
      }
    } else {
      x += colWidth + gutter;
    }
  }

  doc.end();
  return pdfPath;
}

export async function generateLabelsForProduct(params: {
  productId: string;
  count: number;
  prefix?: string;
}) {
  const { productId, count, prefix = 'BX' } = params;

  const product = await prisma.product.findUnique({
    where: { id: BigInt(productId) }
  });
  if (!product) throw new Error('Product not found');

  return prisma.$transaction(async (tx) => {
    // 🔒 find last serial safely
    const last = await tx.barcode.findFirst({
      where: { barcodeValue: { startsWith: prefix } },
      orderBy: { barcodeValue: 'desc' }
    });

    let lastIndex = last
      ? parseInt(last.barcodeValue.replace(prefix, ''), 10)
      : 0;

    const created: any[] = [];
    const labels: LabelRenderItem[] = [];

    for (let i = 0; i < count; i++) {
      lastIndex++;
      const serial = `${prefix}${zeroPad(lastIndex)}`;

      const barcode = await tx.barcode.create({
        data: {
          barcodeValue: serial,
          serialNumber: serial, // Using same value for both fields
          productId: product.id,
          boxQty: product.boxQty
        }
      });

      const png = await renderBarcodePng(serial);

      created.push(barcode);
      labels.push({
        png,
        barcodeString: serial,
        sku: product.sku,
        productName: product.productName,
        boxQty: product.boxQty
      });
    }

    const pdfName = `labels_${product.id}_${Date.now()}.pdf`;
    const pdfPath = await createPdfFromLabels(labels, pdfName);

    return {
      pdfPath,
      createdCount: created.length,
      barcodes: created
    };
  });
}
