const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const normaliseOrder = (order) => {
    if (!order) return null;
    const orderObj = order.toObject ? order.toObject({ virtuals: true }) : order;

    const products = (orderObj.products || orderObj.items || []).map(item => {
        const product = item.product && item.product.toObject ? item.product.toObject() : item.product;
        return {
            name: product?.name || 'Product',
            price: product?.discountPrice || product?.price || item.price || 0,
            quantity: item.quantity || 1,
            total: (product?.discountPrice || product?.price || item.price || 0) * (item.quantity || 1)
        };
    });

    return {
        ...orderObj,
        products,
        subtotal: orderObj.subtotal ?? orderObj.totalAmount ?? 0,
        taxAmount: orderObj.taxAmount ?? 0,
        totalAmount: orderObj.totalAmount ?? orderObj.total ?? orderObj.subtotal ?? 0,
        paymentDisplayName: orderObj.paymentDisplayName || orderObj.paymentMethod,
        paymentDetails: orderObj.paymentDetails || null
    };
};

const renderPaymentSection = (doc, order) => {
    doc.fontSize(12).text('Payment Details:', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).text(`Method: ${order.paymentDisplayName || order.paymentMethod}`);

    if (order.paymentDetails?.card) {
        const { brand, last4, cardholderName, expiryMonth, expiryYear } = order.paymentDetails.card;
        doc.text(`Card: ${brand || 'Card'} ending in ${last4 || 'XXXX'}`);
        if (cardholderName) doc.text(`Cardholder: ${cardholderName}`);
        if (expiryMonth && expiryYear) doc.text(`Expiry: ${String(expiryMonth).padStart(2, '0')}/${String(expiryYear).slice(-2)}`);
    }

    if (order.paymentDetails?.upi) {
        const { appName, vpa, transactionReference, status } = order.paymentDetails.upi;
        doc.text(`UPI App: ${appName || 'UPI'}`);
        if (vpa) doc.text(`VPA: ${vpa}`);
        if (transactionReference) doc.text(`Txn Ref: ${transactionReference}`);
        if (status) doc.text(`Status: ${status}`);
    }

    if (order.paymentDetails?.wallet) {
        const { provider, accountEmail } = order.paymentDetails.wallet;
        doc.text(`Wallet: ${provider || 'Wallet'}`);
        if (accountEmail) doc.text(`Account: ${accountEmail}`);
    }

    if (order.paymentDetails?.notes) {
        doc.text(`Notes: ${order.paymentDetails.notes}`);
    }

    doc.moveDown();
};

const generateInvoice = async (order) => {
    const orderData = normaliseOrder(order);
    if (!orderData) {
        throw new Error('Invalid order data supplied to invoice generator');
    }

    const doc = new PDFDocument({ margin: 50 });

    // Create uploads/invoices directory if it doesn't exist
    const invoiceDir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
    }

    const fileName = `invoice-${orderData._id || orderData.id}.pdf`;
    const filePath = path.join(invoiceDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    // Pipe PDF document to a write stream
    doc.pipe(writeStream);

    // Add company logo and header
    doc.fontSize(20).text('Zalya', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Invoice', { align: 'center' });
    doc.moveDown();

    // Add order details
    doc.fontSize(12).text(`Order #${String(orderData._id || orderData.id).substring(0, 8)}`);
    doc.text(`Date: ${new Date(orderData.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // Add shipping address
    doc.fontSize(12).text('Shipping Address:');
    doc.fontSize(10)
        .text(orderData.shippingAddress.street)
        .text(`${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}`)
        .text(orderData.shippingAddress.country);
    doc.moveDown();

    renderPaymentSection(doc, orderData);

    // Add items table
    doc.fontSize(12).text('Items:', { underline: true });
    doc.moveDown();

    let currentY = doc.y;
    doc.fontSize(10);

    // Table headers
    doc.text('Item', 50, currentY);
    doc.text('Quantity', 250, currentY);
    doc.text('Price', 350, currentY);
    doc.text('Total', 450, currentY);

    currentY += 20;

    // Table content
    orderData.products.forEach(item => {
        doc.text(item.name, 50, currentY);
        doc.text(item.quantity.toString(), 250, currentY);
        doc.text(`₹${item.price.toFixed(2)}`, 350, currentY);
        doc.text(`₹${item.total.toFixed(2)}`, 450, currentY);

        currentY += 20;
    });

    doc.moveDown();
    doc.text('', 50, currentY);
    currentY += 20;

    // Add total
    doc.fontSize(12);
    doc.text(`Subtotal: ₹${orderData.subtotal.toFixed(2)}`, 350, currentY);
    currentY += 16;
    doc.text(`Tax: ₹${orderData.taxAmount.toFixed(2)}`, 350, currentY);
    currentY += 16;
    doc.font('Helvetica-Bold').text(`Total: ₹${orderData.totalAmount.toFixed(2)}`, 350, currentY);
    doc.font('Helvetica');

    // Finalize the PDF
    doc.end();

    // Return a Promise that resolves when the PDF is written
    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(filePath));
        writeStream.on('error', reject);
    });
};

module.exports = { generateInvoice };