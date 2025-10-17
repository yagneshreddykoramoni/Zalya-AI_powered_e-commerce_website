import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, Package, ArrowRight, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { getOrderDetails } from '@/services/orderService';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
}

interface Order {
  _id: string;
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    paymentMethod?: string;
    cardNumber?: string;
    cardName?: string;
    expiryDate?: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  products: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  paymentDisplayName?: string;
  paymentDetails?: {
    type?: string;
    savedPaymentMethodId?: string;
    card?: {
      brand?: string;
      last4?: string;
      cardholderName?: string;
      expiryMonth?: number;
      expiryYear?: number;
    };
    upi?: {
      appName?: string;
      vpa?: string;
      transactionReference?: string;
      status?: string;
      intentUrl?: string;
      paidAt?: string;
    };
    wallet?: {
      provider?: string;
      accountEmail?: string;
    };
  };
}

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(location.state?.orderDetails || null);
  const orderCardRef = useRef<HTMLDivElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // If we already have order details from state, no need to fetch
        if (location.state?.orderDetails) return;
        
        if (!orderId) {
          navigate('/');
          return;
        }
        
        const response = await getOrderDetails(orderId);
        if (!response.success || !response.order) {
          throw new Error(response.message || 'Failed to load order details');
        }
        
        setOrder(response.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate, location.state]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div>Loading order details...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Order Information Unavailable</h2>
            <p className="mb-4">{error}</p>
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div>Order not found</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Format display data from the real order
  const displayData = {
    orderNumber: order._id,
    ...order,
    contactInfo: {
      firstName: order.contactInfo.firstName,
      lastName: order.contactInfo.lastName,
      email: order.contactInfo.email,
      phone: order.contactInfo.phone,
      paymentMethod: order.contactInfo.paymentMethod || order.paymentMethod || '',
      cardNumber: order.contactInfo.cardNumber || '',
      cardName: order.contactInfo.cardName || '',
      expiryDate: order.contactInfo.expiryDate || ''
    },
    orderInfo: {
      items: order.products.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      subtotal: order.subtotal,
      tax: order.taxAmount,
      total: order.totalAmount
    }
  };

  const normalizedPaymentMethod = (order.paymentMethod || displayData.contactInfo.paymentMethod || '').toLowerCase();
  const paymentDetails = order.paymentDetails ?? {};
  const cardInfo = paymentDetails.card;
  const upiInfo = paymentDetails.upi;
  const walletInfo = paymentDetails.wallet;

  const fallbackCardNumberDigits = displayData.contactInfo.cardNumber
    ? displayData.contactInfo.cardNumber.replace(/\D/g, '')
    : '';
  const fallbackCardLast4 = fallbackCardNumberDigits ? fallbackCardNumberDigits.slice(-4) : '';
  const fallbackCardholder = displayData.contactInfo.cardName || '';
  const fallbackExpiry = displayData.contactInfo.expiryDate || '';

  const toExpiryString = (month?: number, year?: number) => {
    if (!month || !year) {
      return '';
    }
    const twoDigitYear = year % 100;
    return `${String(month).padStart(2, '0')}/${String(twoDigitYear).padStart(2, '0')}`;
  };

  const formatUpiStatus = (status?: string) => {
    if (!status) {
      return 'Pending Confirmation';
    }
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'initiated':
        return 'Awaiting Confirmation';
      case 'pending':
        return 'Pending Confirmation';
      case 'failed':
        return 'Payment Failed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  let paymentSummaryLabel = order.paymentDisplayName || '';
  const paymentInfoLines: Array<{ label: string; value: string }> = [];

  switch (normalizedPaymentMethod) {
    case 'credit-card': {
      const brand = cardInfo?.brand || 'Credit Card';
      const last4 = cardInfo?.last4 || fallbackCardLast4;
      const cardholderName = cardInfo?.cardholderName || fallbackCardholder;
      const expiry = toExpiryString(cardInfo?.expiryMonth, cardInfo?.expiryYear) || fallbackExpiry;

      paymentSummaryLabel = last4 ? `${brand} ending •••• ${last4}` : brand;

      if (cardholderName) {
        paymentInfoLines.push({
          label: 'Cardholder',
          value: cardholderName
        });
      }

      if (expiry) {
        paymentInfoLines.push({
          label: 'Expiry',
          value: expiry
        });
      }

      break;
    }
  case 'upi-app':
  case 'upi':
  case 'upi_qr': {
      const appName = upiInfo?.appName || (order.paymentDisplayName?.replace(/^UPI\s*\(|\)$/g, '') || 'UPI App');
      paymentSummaryLabel = `UPI (${appName})`;

      if (upiInfo?.vpa) {
        paymentInfoLines.push({ label: 'VPA', value: upiInfo.vpa });
      }

      if (upiInfo?.transactionReference) {
        paymentInfoLines.push({
          label: 'Reference',
          value: upiInfo.transactionReference
        });
      }

      if (upiInfo?.status || upiInfo?.paidAt) {
        const statusLabel = formatUpiStatus(upiInfo?.status);
        const paidAtLabel = upiInfo?.paidAt
          ? new Date(upiInfo.paidAt).toLocaleString()
          : undefined;

        paymentInfoLines.push({
          label: 'Status',
          value: paidAtLabel ? `${statusLabel} (${paidAtLabel})` : statusLabel
        });
      }

      break;
    }
    case 'paypal': {
      paymentSummaryLabel = 'PayPal';

      if (walletInfo?.accountEmail) {
        paymentInfoLines.push({ label: 'Account', value: walletInfo.accountEmail });
      }

      break;
    }
    default: {
      if (walletInfo?.provider) {
        paymentSummaryLabel = walletInfo.provider;
        if (walletInfo.accountEmail) {
          paymentInfoLines.push({ label: 'Account', value: walletInfo.accountEmail });
        }
      }

      if (!paymentSummaryLabel) {
        paymentSummaryLabel = order.paymentDisplayName || (normalizedPaymentMethod
          ? normalizedPaymentMethod
              .replace(/-/g, ' ')
              .replace(/\b\w/g, char => char.toUpperCase())
          : 'Payment');
      }

      break;
    }
  }

  if (!paymentSummaryLabel) {
    paymentSummaryLabel = 'Payment';
  }

  // Generate a display order number
  const orderNumber = `ORD-${order._id.substring(0, 8).toUpperCase()}`;
  const today = new Date();
  const estimatedDelivery = new Date(today.setDate(today.getDate() + 5));

  const handleDownloadPdf = async () => {
    if (!orderCardRef.current) {
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      if (typeof html2canvas !== 'function' || typeof jsPDF !== 'function') {
        throw new Error('Failed to load PDF dependencies');
      }

      const canvas = await html2canvas(orderCardRef.current, {
        scale: Math.min(2, window.devicePixelRatio || 2),
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${orderNumber}-confirmation.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      window.alert('Unable to generate the PDF right now. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Format card number to show only last 4 digits
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={orderCardRef} className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="text-green-500" size={32} />
            </div>
            <h1 className="text-3xl font-bold">Order Confirmed!</h1>
            <p className="text-gray-600 mt-2">
              Thank you for your purchase. Your order has been received.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Order Details</h2>
              <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-medium">{orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{paymentSummaryLabel}</p>
              </div>
            </div>
            
            {/* Customer Information */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-medium mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm">{displayData.contactInfo.email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm">{displayData.contactInfo.phone}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shipping Information */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-medium mb-3">Shipping Information</h3>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Shipping Address</p>
                  <p className="text-sm">{displayData.contactInfo.firstName} {displayData.contactInfo.lastName}</p>
                  <p className="text-sm">{order.shippingAddress.street}</p>
                  <p className="text-sm">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                  <p className="text-sm">{order.shippingAddress.country}</p>
                </div>
              </div>
            </div>
            
            {/* Payment Information */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-medium mb-3">Payment Information</h3>
              <div className="flex items-start">
                <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="text-sm">{paymentSummaryLabel}</p>
                  {paymentInfoLines.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {paymentInfoLines.map(line => (
                        <div key={line.label} className="flex flex-wrap gap-1">
                          <span className="text-gray-500">{line.label}:</span>
                          <span>{line.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-medium mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({order.products.length} items)</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{order.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center mt-6">
              <div className="flex-shrink-0">
                <div className="bg-brand-100 p-2 rounded-full">
                  <Package className="text-brand-600" size={24} />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Expected Delivery</h3>
                <p className="text-gray-600 text-sm">
                  {estimatedDelivery.toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">What happens next?</h2>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="flex-shrink-0 mr-4 w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center font-medium text-brand-700 text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Order Processing</h3>
                  <p className="text-sm text-gray-600">
                    We're preparing your items for shipment.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4 w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center font-medium text-brand-700 text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Shipping</h3>
                  <p className="text-sm text-gray-600">
                    We'll send you a confirmation email with tracking information.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4 w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center font-medium text-brand-700 text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Delivery</h3>
                  <p className="text-sm text-gray-600">
                    Your items will be delivered to your address.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
            <Button asChild className="flex-1">
              <Link to="/profile">
                Track Orders
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">
                Continue Shopping
                <ArrowRight className="ml-2" size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;