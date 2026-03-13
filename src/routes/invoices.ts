import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import PDFDocument from 'pdfkit';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

const rupee = (n: unknown) =>
  'Rs. ' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// GET /api/invoices
invoicesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { shopId: req.user!.shopId };
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { order: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { customer: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ success: true, data, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// GET /api/invoices/:id
invoicesRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.invoice.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        order: {
          include: {
            customer:  true,
            items:     true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });
    if (!item) throw new AppError('Invoice not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// GET /api/invoices/:id/pdf  ──  streams a PDF to the client
invoicesRouter.get('/:id/pdf', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        shop:  true,
        order: { include: { customer: true, items: true } },
      },
    });
    if (!invoice) throw new AppError('Invoice not found', 404);

    const { shop, order } = invoice;
    const customer = order.customer;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    doc.pipe(res);

    // ── Header: shop info ──────────────────────────────────────────────────
    doc
      .fillColor('#00a99d')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(shop.name, 50, 50);

    doc
      .fillColor('#666')
      .fontSize(9)
      .font('Helvetica');
    if (shop.address) doc.text(shop.address);
    if (shop.city)
      doc.text(
        [shop.city, shop.state, shop.pincode].filter(Boolean).join(', ')
      );
    if (shop.phone)  doc.text(`Phone: ${shop.phone}`);
    if (shop.email)  doc.text(`Email: ${shop.email}`);
    if (shop.gstin)  doc.text(`GSTIN: ${shop.gstin}`);

    // ── Invoice label (top-right) ──────────────────────────────────────────
    doc
      .fillColor('#0d1b2e')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('TAX INVOICE', 350, 50, { align: 'right' });

    doc
      .fillColor('#555')
      .fontSize(9)
      .font('Helvetica')
      .text(`Invoice #: ${invoice.invoiceNumber}`,   350,  80, { align: 'right' })
      .text(`Order #:   ${order.orderNumber}`,        350,  93, { align: 'right' })
      .text(`Date:      ${order.createdAt.toLocaleDateString('en-IN')}`, 350, 106, { align: 'right' });

    // ── Divider ────────────────────────────────────────────────────────────
    doc
      .moveTo(50, 138)
      .lineTo(545, 138)
      .strokeColor('#00a99d')
      .lineWidth(2)
      .stroke();

    // ── Bill To ────────────────────────────────────────────────────────────
    doc
      .fillColor('#888')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('BILL TO', 50, 150);

    doc
      .fillColor('#1a2332')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(customer.name, 50, 163);

    doc
      .fillColor('#555')
      .fontSize(9)
      .font('Helvetica');
    if (customer.mobile) doc.text(`Phone: ${customer.mobile}`);
    if (customer.email)  doc.text(`Email: ${customer.email}`);
    if (customer.city)   doc.text(`City:  ${customer.city}`);

    // ── Items table header ─────────────────────────────────────────────────
    const TABLE_TOP = 248;
    doc
      .fillColor('#00a99d')
      .rect(50, TABLE_TOP, 495, 22)
      .fill();

    doc
      .fillColor('#fff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('#',          55,  TABLE_TOP + 7)
      .text('Item',       75,  TABLE_TOP + 7)
      .text('Qty',       340,  TABLE_TOP + 7, { width: 40,  align: 'right' })
      .text('Unit Price',385,  TABLE_TOP + 7, { width: 70,  align: 'right' })
      .text('Total',     460,  TABLE_TOP + 7, { width: 80,  align: 'right' });

    // ── Items table rows ───────────────────────────────────────────────────
    let y = TABLE_TOP + 30;
    order.items.forEach((item, i) => {
      doc
        .fillColor(i % 2 === 0 ? '#f9fafb' : '#ffffff')
        .rect(50, y - 5, 495, 22)
        .fill();

      doc
        .fillColor('#1a2332')
        .fontSize(9)
        .font('Helvetica')
        .text(String(i + 1),              55, y)
        .text(item.name,                  75, y, { width: 260 })
        .text(String(item.qty),          340, y, { width: 40,  align: 'right' })
        .text(rupee(item.unitPrice),     385, y, { width: 70,  align: 'right' })
        .text(rupee(item.total),         460, y, { width: 80,  align: 'right' });

      y += 22;
    });

    // ── Totals ─────────────────────────────────────────────────────────────
    doc
      .moveTo(50, y + 5)
      .lineTo(545, y + 5)
      .strokeColor('#e2e8ef')
      .lineWidth(1)
      .stroke();

    y += 16;

    const drawTotalRow = (label: string, value: string, bold = false, color = '#333') => {
      doc
        .fillColor('#666')
        .fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 360, y);
      doc
        .fillColor(color)
        .text(value, 460, y, { width: 80, align: 'right' });
      y += 16;
    };

    drawTotalRow('Subtotal:', rupee(order.subtotal));
    if (Number(order.discountAmt) > 0)
      drawTotalRow('Discount:', `- ${rupee(order.discountAmt)}`, false, '#cc3333');
    if (Number(order.taxAmt) > 0)
      drawTotalRow(`Tax (${order.taxPct}%):`, rupee(order.taxAmt));

    // Grand total band
    y += 4;
    doc.fillColor('#00a99d').rect(355, y - 4, 190, 28).fill();
    doc
      .fillColor('#fff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 365, y + 4)
      .text(rupee(order.total), 430, y + 4, { width: 110, align: 'right' });

    y += 40;

    // ── Payment info ───────────────────────────────────────────────────────
    doc
      .fillColor('#555')
      .fontSize(9)
      .font('Helvetica')
      .text(`Payment Mode: ${order.paymentMode.toUpperCase()}`,  50, y)
      .text(`Amount Paid:  ${rupee(order.amountPaid)}`,          50, y + 14);
    if (Number(order.changeGiven) > 0)
      doc.text(`Change Given: ${rupee(order.changeGiven)}`,      50, y + 28);

    // ── Footer ─────────────────────────────────────────────────────────────
    doc
      .moveTo(50, 760)
      .lineTo(545, 760)
      .strokeColor('#e2e8ef')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#aaa')
      .fontSize(8)
      .text('Thank you for your business! • Powered by LensFlow ERP', 50, 770, {
        align: 'center',
        width: 495,
      });

    doc.end();
  } catch (err) { next(err); }
});

// GET /api/invoices/:id/whatsapp  ──  returns a wa.me share link
invoicesRouter.get('/:id/whatsapp', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        shop:  true,
        order: { include: { customer: true } },
      },
    });
    if (!invoice) throw new AppError('Invoice not found', 404);

    const { shop, order } = invoice;
    const customer = order.customer;
    const phone    = customer.mobile?.replace(/\D/g, '') ?? '';

    const message = encodeURIComponent(
      `Hello ${customer.name} 👋\n\n` +
      `Thank you for shopping at *${shop.name}*!\n\n` +
      `🧾 *Invoice:* ${invoice.invoiceNumber}\n` +
      `📦 *Order:*   ${order.orderNumber}\n` +
      `💰 *Amount:*  Rs. ${Number(order.total).toLocaleString('en-IN')}\n` +
      `📅 *Date:*    ${order.createdAt.toLocaleDateString('en-IN')}\n\n` +
      `We appreciate your business! 🙏`
    );

    const link = `https://wa.me/${phone ? '91' + phone : ''}?text=${message}`;

    // mark sent
    await prisma.invoice.update({
      where: { id: invoice.id },
      data:  { sentViaWA: true },
    });

    res.json({ success: true, data: { link } });
  } catch (err) { next(err); }
});
