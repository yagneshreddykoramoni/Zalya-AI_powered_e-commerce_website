import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createOrder } from '@/services/orderService';
import { fetchSavedAddresses, saveAddress, SavedAddress } from '@/services/addressService';
import { fetchSavedPaymentMethods, savePaymentMethod, SavedPaymentMethod } from '@/services/paymentMethodService';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { CheckCircle2, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';

const BUSINESS_UPI_ID = import.meta.env.VITE_BUSINESS_UPI_ID || 'zalya@upi';
const BUSINESS_UPI_NAME = import.meta.env.VITE_BUSINESS_UPI_NAME || 'Zalya';

const PAYMENT_APPS = [
  {
    id: 'phonepe',
    label: 'PhonePe',
    description: 'Open PhonePe with amount and notes pre-filled',
    scheme: 'phonepe://pay',
  },
  {
    id: 'gpay',
    label: 'GPay',
    description: 'Launch Google Pay using Android intent',
    packageName: 'com.google.android.apps.nbu.paisa.user',
  },
  {
    id: 'paytm',
    label: 'Paytm',
    description: 'Redirect into the Paytm UPI flow instantly',
    scheme: 'paytmmp://pay',
  },
  {
    id: 'qr',
    label: 'QR Code',
    description: 'Show a QR you can scan from any UPI app',
  },
] as const;

type PaymentAppOption = (typeof PAYMENT_APPS)[number];
type PaymentAppId = PaymentAppOption['id'];
type CheckoutPaymentMethod = 'credit-card' | 'paypal' | 'payment-apps';

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  paymentMethod: CheckoutPaymentMethod;
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

const generateUpiReference = () => `SV${Date.now()}`;

const extractQueryString = (upiLink: string) => {
  const [, query = ''] = upiLink.split('?');
  return query;
};

const buildPaymentIntentUrl = (app: PaymentAppOption, upiLink: string) => {
  const query = extractQueryString(upiLink);
  if (!query || app.id === 'qr') {
    return upiLink;
  }

  if (app.scheme) {
    return `${app.scheme}?${query}`;
  }

  if (app.packageName) {
    return `intent://pay?${query}#Intent;scheme=upi;package=${app.packageName};end`;
  }

  return upiLink;
};

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user, cart, clearCart, updateUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'IND',
    phone: '',
    paymentMethod: 'credit-card',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [saveAddressForLater, setSaveAddressForLater] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const addressPrefilledRef = useRef(false);

  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<'new' | string>('new');
  const [saveCardForLater, setSaveCardForLater] = useState(false);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(false);
  const [isSavingPaymentMethod, setIsSavingPaymentMethod] = useState(false);
  const paymentPrefilledRef = useRef(false);

  const [selectedPaymentAppId, setSelectedPaymentAppId] = useState<PaymentAppId>('phonepe');
  const [upiReferenceId, setUpiReferenceId] = useState(() => generateUpiReference());
  const [lastIntentUrl, setLastIntentUrl] = useState('');
  const [paymentAttemptStarted, setPaymentAttemptStarted] = useState(false);
  const [awaitingAppReturn, setAwaitingAppReturn] = useState(false);
  const [paymentAppError, setPaymentAppError] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const userPrefilledRef = useRef(false);

  const cartItems = useMemo(() => cart?.items ?? [], [cart]);
  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems]
  );

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.product?.discountPrice ?? item.product?.price ?? 0;
      return sum + price * (item.quantity || 1);
    }, 0);
    const tax = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [cartItems]);

  const selectedPaymentApp = useMemo(
    () => PAYMENT_APPS.find(app => app.id === selectedPaymentAppId) ?? PAYMENT_APPS[0],
    [selectedPaymentAppId]
  );

  const isSavedCardSelected = selectedPaymentMethodId !== 'new';

  const upiLink = useMemo(() => {
    const amount = totals.total || 0;
    const params = new URLSearchParams({
      pa: BUSINESS_UPI_ID,
      pn: BUSINESS_UPI_NAME,
      am: amount.toFixed(2),
      cu: 'INR',
  tn: `Zalya order ${upiReferenceId}`,
      tr: upiReferenceId,
    });
    return `upi://pay?${params.toString()}`;
  }, [totals.total, upiReferenceId]);

  useEffect(() => {
    if (!user) {
      userPrefilledRef.current = false;
      return;
    }

    if (userPrefilledRef.current) {
      return;
    }

    const tokens = user.name?.trim().split(/\s+/) ?? [];
    const firstName = tokens[0] ?? '';
    const lastName = tokens.slice(1).join(' ');

    setFormData(prev => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
      cardName: prev.cardName || user.name || '',
    }));

    userPrefilledRef.current = true;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setSavedPaymentMethods([]);
      setSelectedAddressId(null);
      setSelectedPaymentMethodId('new');
      setSaveAddressForLater(false);
      setSaveCardForLater(false);
      addressPrefilledRef.current = false;
      paymentPrefilledRef.current = false;
      return;
    }

    let cancelled = false;

    const loadSavedData = async () => {
      setIsAddressLoading(true);
      setIsPaymentMethodsLoading(true);

      try {
        const [addressResult, paymentResult] = await Promise.allSettled([
          fetchSavedAddresses(),
          fetchSavedPaymentMethods(),
        ]);

        if (cancelled) {
          return;
        }

        if (addressResult.status === 'fulfilled') {
          const addresses = addressResult.value;
          setSavedAddresses(addresses);

          if (addresses.length > 0 && !addressPrefilledRef.current) {
            const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0];
            setSelectedAddressId(defaultAddress._id);
            setFormData(prev => ({
              ...prev,
              firstName: defaultAddress.firstName,
              lastName: defaultAddress.lastName,
              email: defaultAddress.email,
              phone: defaultAddress.phone,
              address: defaultAddress.address,
              city: defaultAddress.city,
              state: defaultAddress.state,
              zip: defaultAddress.zip,
              country: defaultAddress.country,
            }));
            addressPrefilledRef.current = true;
          }
        } else if (addressResult.reason) {
          console.error(addressResult.reason);
          toast.error(
            addressResult.reason instanceof Error
              ? addressResult.reason.message
              : 'Failed to load saved addresses.'
          );
        }

        if (paymentResult.status === 'fulfilled') {
          const methods = paymentResult.value;
          setSavedPaymentMethods(methods);

          if (methods.length > 0 && !paymentPrefilledRef.current) {
            const defaultMethod = methods.find(method => method.isDefault) ?? methods[0];
            setSelectedPaymentMethodId(defaultMethod.id);
            setFormData(prev => ({
              ...prev,
              cardName: defaultMethod.cardholderName,
              cardNumber: `**** **** **** ${defaultMethod.last4}`,
              expiryDate: `${String(defaultMethod.expiryMonth).padStart(2, '0')}/${String(defaultMethod.expiryYear % 100).padStart(2, '0')}`,
            }));
            paymentPrefilledRef.current = true;
            setSaveCardForLater(false);
          }
        } else if (paymentResult.reason) {
          console.error(paymentResult.reason);
          toast.error(
            paymentResult.reason instanceof Error
              ? paymentResult.reason.message
              : 'Failed to load saved payment methods.'
          );
        }
      } catch (error) {
        console.error('Checkout load error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load saved data.');
      } finally {
        if (!cancelled) {
          setIsAddressLoading(false);
          setIsPaymentMethodsLoading(false);
        }
      }
    };

    loadSavedData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!awaitingAppReturn) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setAwaitingAppReturn(false);
        toast.info('Welcome back! Tap "Confirm Payment" once the transfer succeeds.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [awaitingAppReturn]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'].includes(name)) {
      setSelectedAddressId(null);
      addressPrefilledRef.current = false;
    }

    if (['cardNumber', 'cardName', 'expiryDate', 'cvv'].includes(name)) {
      if (selectedPaymentMethodId !== 'new') {
        setSelectedPaymentMethodId('new');
      }
      paymentPrefilledRef.current = false;
    }
  };

  const handleSelectAddress = (addressId: string) => {
    const address = savedAddresses.find(item => item._id === addressId);
    if (!address) {
      return;
    }

    setSelectedAddressId(addressId);
    setFormData(prev => ({
      ...prev,
      firstName: address.firstName,
      lastName: address.lastName,
      email: address.email,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
    }));
    setSaveAddressForLater(false);
    addressPrefilledRef.current = true;
  };

  const handleSelectSavedPaymentMethod = (paymentMethodId: string) => {
    if (paymentMethodId === 'new') {
      setSelectedPaymentMethodId('new');
      setFormData(prev => ({
        ...prev,
        cardNumber: '',
        cardName: user?.name || '',
        expiryDate: '',
      }));
      setSaveCardForLater(false);
      paymentPrefilledRef.current = false;
      return;
    }

    const method = savedPaymentMethods.find(item => item.id === paymentMethodId);
    if (!method) {
      return;
    }

    setSelectedPaymentMethodId(paymentMethodId);
    setFormData(prev => ({
      ...prev,
      cardName: method.cardholderName,
      cardNumber: `**** **** **** ${method.last4}`,
      expiryDate: `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear % 100).padStart(2, '0')}`,
    }));
    setSaveCardForLater(false);
    paymentPrefilledRef.current = true;
  };

  const handlePaymentMethodChange = (value: string) => {
    const paymentMethod = value as CheckoutPaymentMethod;

    setFormData(prev => ({
      ...prev,
      paymentMethod,
    }));

    if (paymentMethod !== 'credit-card') {
      setSelectedPaymentMethodId('new');
      setSaveCardForLater(false);
      paymentPrefilledRef.current = false;
    }

    if (paymentMethod === 'payment-apps') {
      setSelectedPaymentAppId('phonepe');
      setUpiReferenceId(generateUpiReference());
      setPaymentAppError(null);
      setPaymentAttemptStarted(false);
      setLastIntentUrl('');
    } else {
      setPaymentAppError(null);
      setPaymentAttemptStarted(false);
      setLastIntentUrl('');
    }
  };

  const handlePaymentAppTileClick = (appId: PaymentAppId) => {
    setSelectedPaymentAppId(appId);
    setPaymentAppError(null);
    setPaymentAttemptStarted(appId === 'qr');
    setLastIntentUrl('');

    if (appId === 'qr') {
      setUpiReferenceId(generateUpiReference());
    }
  };

  const handleLaunchPaymentApp = (appId: PaymentAppId) => {
    const app = PAYMENT_APPS.find(item => item.id === appId);
    if (!app || app.id === 'qr') {
      return;
    }

    const intentUrl = buildPaymentIntentUrl(app, upiLink);
    setLastIntentUrl(intentUrl);
    setPaymentAppError(null);
    setPaymentAttemptStarted(true);
    setAwaitingAppReturn(true);

    try {
      window.location.href = intentUrl;
    } catch (error) {
      console.error('Deep link error:', error);
      setAwaitingAppReturn(false);
      setPaymentAppError('Unable to open the app automatically. Please scan the QR code instead.');
    }
  };

  const handleRefreshQr = () => {
    setUpiReferenceId(generateUpiReference());
    setPaymentAppError(null);
    setPaymentAttemptStarted(true);
    setLastIntentUrl('');
  };

  const handleSubmitShipping = async (event: React.FormEvent) => {
    event.preventDefault();

    if (saveAddressForLater) {
      if (!user) {
        toast.error('Please log in to save addresses for future orders.');
        return;
      }

      setIsAddressLoading(true);
      try {
        const response = await saveAddress({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          isDefault: true,
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to save address.');
        }

        setSavedAddresses(response.addresses);
        setSelectedAddressId(response.address._id);
        addressPrefilledRef.current = true;
        setSaveAddressForLater(false);

        if (user) {
          updateUser?.({
            ...user,
            savedAddresses: response.addresses,
          });
        }

        toast.success(response.message || 'Address saved successfully.');
      } catch (error) {
        console.error('Save address error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save address.');
        setIsAddressLoading(false);
        return;
      } finally {
        setIsAddressLoading(false);
      }
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = useCallback(
    async (options?: {
      paymentStatus?: 'initiated' | 'paid';
      intentUrlOverride?: string;
      appLabelOverride?: string;
    }) => {
      if (!user?.id) {
        throw new Error('Please log in to place an order.');
      }

      if (!cartItems.length) {
        throw new Error('Your cart is empty.');
      }

      const itemsPayload = cartItems.map(item => {
        const productId =
          typeof item.product === 'string'
            ? item.product
            : item.product?._id;

        if (!productId) {
          throw new Error(`Invalid product in cart: ${JSON.stringify(item)}`);
        }

        return {
          product: { _id: productId },
          quantity: item.quantity || 1,
        };
      });

      const paymentAppLabel =
        PAYMENT_APPS.find(app => app.id === selectedPaymentAppId)?.label ?? selectedPaymentAppId;

      const payload = {
        user: user.id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        country: formData.country.trim(),
        phone: formData.phone.trim(),
        paymentMethod: formData.paymentMethod === 'payment-apps' ? 'upi-app' : formData.paymentMethod,
        savedPaymentMethodId:
          formData.paymentMethod === 'credit-card' && isSavedCardSelected
            ? selectedPaymentMethodId
            : undefined,
        cardNumber:
          formData.paymentMethod === 'credit-card' && !isSavedCardSelected
            ? formData.cardNumber.replace(/\s|-/g, '')
            : undefined,
        cardName:
          formData.paymentMethod === 'credit-card'
            ? formData.cardName.trim()
            : undefined,
        expiryDate:
          formData.paymentMethod === 'credit-card'
            ? formData.expiryDate.trim()
            : undefined,
        upiApp:
          formData.paymentMethod === 'payment-apps'
            ? options?.appLabelOverride ?? paymentAppLabel
            : undefined,
        upiTransactionId:
          formData.paymentMethod === 'payment-apps' ? upiReferenceId : undefined,
        upiVpa:
          formData.paymentMethod === 'payment-apps' ? BUSINESS_UPI_ID : undefined,
        upiStatus:
          formData.paymentMethod === 'payment-apps'
            ? options?.paymentStatus ?? 'initiated'
            : undefined,
        upiIntentUrl:
          formData.paymentMethod === 'payment-apps'
            ? (options?.intentUrlOverride ?? lastIntentUrl) || upiLink
            : undefined,
        items: itemsPayload,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      };

      setIsLoading(true);
      try {
        const response = await createOrder(payload);

        if (!response.success) {
          throw new Error(response.message || 'Order failed.');
        }

        if (clearCart) {
          await clearCart();
        }

        navigate(`/order-confirmation/${response.orderId}`, {
          state: {
            orderDetails: response.order,
          },
        });
        toast.success('Order placed successfully!');
      } catch (error) {
        console.error('Order placement error:', error);
        const message =
          error instanceof Error ? error.message : 'Failed to place order. Please try again.';
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      user?.id,
      cartItems,
      formData,
      isSavedCardSelected,
      selectedPaymentMethodId,
      selectedPaymentAppId,
      upiReferenceId,
      lastIntentUrl,
      upiLink,
      totals.subtotal,
      totals.tax,
      totals.total,
      clearCart,
      navigate,
    ]
  );

  const handleConfirmPayment = async () => {
    if (!paymentAttemptStarted) {
      toast.error('Start a payment attempt by opening an app or scanning the QR code first.');
      return;
    }

    setPaymentAppError(null);
    setIsConfirmingPayment(true);

    try {
      await placeOrder({ paymentStatus: 'paid', intentUrlOverride: lastIntentUrl || upiLink });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm payment.';
      setPaymentAppError(message);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleSubmitPayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Please log in to place an order.');
      return;
    }

    if (!cartItems.length) {
      toast.error('Your cart is empty.');
      return;
    }

    if (formData.paymentMethod === 'payment-apps') {
      toast.info('Complete the payment using an app and then tap "Confirm Payment".');
      return;
    }

    if (formData.paymentMethod === 'credit-card' && saveCardForLater && selectedPaymentMethodId === 'new') {
      if (!formData.cardNumber || !formData.cardName || !formData.expiryDate) {
        toast.error('Please fill in all card details before saving.');
        return;
      }

      const cleanedCardNumber = formData.cardNumber.replace(/\s|-/g, '');
      if (!/^\d{12,19}$/.test(cleanedCardNumber)) {
        toast.error('Card number must contain 12 to 19 digits.');
        return;
      }

      const [rawMonth, rawYear] = formData.expiryDate.split('/');
      const expiryMonth = Number.parseInt(rawMonth ?? '', 10);
      let expiryYear = Number.parseInt(rawYear ?? '', 10);

      if (Number.isNaN(expiryMonth) || Number.isNaN(expiryYear)) {
        toast.error('Invalid expiry date.');
        return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (expiryMonth < 1 || expiryMonth > 12) {
        toast.error('Expiry month must be between 1 and 12.');
        return;
      }

      if (expiryYear < 100) {
        const century = Math.floor(currentYear / 100) * 100;
        expiryYear = century + expiryYear;
      }

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        toast.error('Card has expired.');
        return;
      }

      setIsSavingPaymentMethod(true);
      try {
        const response = await savePaymentMethod({
          cardholderName: formData.cardName,
          cardNumber: cleanedCardNumber,
          expiryMonth,
          expiryYear,
          isDefault: true,
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to save payment method.');
        }

        setSavedPaymentMethods(response.paymentMethods);
        setSelectedPaymentMethodId(response.paymentMethod.id);
        paymentPrefilledRef.current = true;
        setSaveCardForLater(false);

        if (user) {
          updateUser?.({
            ...user,
            savedPaymentMethods: response.paymentMethods,
          });
        }

        toast.success(response.message || 'Payment method saved for future orders.');

        setFormData(prev => ({
          ...prev,
          cardNumber: `**** **** **** ${response.paymentMethod.last4}`,
          cardName: response.paymentMethod.cardholderName,
          expiryDate: `${String(response.paymentMethod.expiryMonth).padStart(2, '0')}/${String(
            response.paymentMethod.expiryYear % 100
          ).padStart(2, '0')}`,
        }));
      } catch (error) {
        console.error('Save payment method error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save payment method.');
        setIsSavingPaymentMethod(false);
        return;
      } finally {
        setIsSavingPaymentMethod(false);
      }
    }

    try {
      const paymentStatus = formData.paymentMethod === 'paypal' ? 'initiated' : 'paid';
      await placeOrder({ paymentStatus });
    } catch {
      // The error is already handled inside placeOrder
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Checkout</h1>

          <div className="flex mb-8">
            <div
              className={clsx(
                'flex-1 text-center pb-2 border-b-2 text-sm font-medium uppercase tracking-wide',
                step === 1 ? 'border-brand-600 text-brand-600' : 'border-gray-200 text-gray-500'
              )}
            >
              1. Shipping
            </div>
            <div
              className={clsx(
                'flex-1 text-center pb-2 border-b-2 text-sm font-medium uppercase tracking-wide',
                step === 2 ? 'border-brand-600 text-brand-600' : 'border-gray-200 text-gray-500'
              )}
            >
              2. Payment
            </div>
          </div>

          {step === 1 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
              <form onSubmit={handleSubmitShipping} className="space-y-6">
                {user && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Saved Addresses</h3>
                      {isAddressLoading && (
                        <span className="text-xs text-gray-500">Loading...</span>
                      )}
                    </div>
                    {isAddressLoading ? (
                      <div className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        Loading your saved addresses
                      </div>
                    ) : savedAddresses.length > 0 ? (
                      <RadioGroup
                        value={selectedAddressId ?? ''}
                        onValueChange={handleSelectAddress}
                        className="space-y-3"
                      >
                        {savedAddresses.map((address) => (
                          <div
                            key={address._id}
                            className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                          >
                            <RadioGroupItem
                              value={address._id}
                              id={`saved-address-${address._id}`}
                              className="mt-1"
                            />
                            <label
                              htmlFor={`saved-address-${address._id}`}
                              className="flex-1 cursor-pointer space-y-1 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {address.firstName} {address.lastName}
                                </span>
                                {address.isDefault && (
                                  <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600">
                                {address.address}, {address.city}, {address.state} {address.zip}
                              </p>
                              <p className="text-gray-600">Phone: {address.phone}</p>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <p className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        You haven&apos;t saved any addresses yet. Fill in the form below and check
                        &quot;Save this address&quot; to keep it for next time.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip Code</Label>
                    <Input
                      id="zip"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="save-address"
                    checked={saveAddressForLater}
                    onCheckedChange={checked => setSaveAddressForLater(checked === true)}
                    disabled={!user}
                  />
                  <div>
                    <label htmlFor="save-address" className="text-sm">
                      Save this address for future orders
                    </label>
                    {!user && (
                      <p className="text-xs text-gray-500">Log in to save addresses for future checkouts.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full md:w-auto" disabled={isAddressLoading}>
                    {isAddressLoading ? 'Saving address...' : 'Continue to Payment'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-xl font-medium mb-4">Payment Method</h2>
              <form onSubmit={handleSubmitPayment} className="space-y-6">
                {user && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Saved Cards</h3>
                      {isPaymentMethodsLoading && (
                        <span className="text-xs text-gray-500">Loading...</span>
                      )}
                    </div>
                    {isPaymentMethodsLoading ? (
                      <div className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        Loading your saved cards
                      </div>
                    ) : savedPaymentMethods.length > 0 ? (
                      <RadioGroup
                        value={selectedPaymentMethodId}
                        onValueChange={handleSelectSavedPaymentMethod}
                        className="space-y-3"
                      >
                        {savedPaymentMethods.map(method => (
                          <div
                            key={method.id}
                            className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                          >
                            <RadioGroupItem value={method.id} id={`saved-card-${method.id}`} className="mt-1" />
                            <label htmlFor={`saved-card-${method.id}`} className="flex-1 cursor-pointer text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {method.brand} ending in {method.last4}
                                </span>
                                {method.isDefault && (
                                  <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600">{method.cardholderName}</p>
                              <p className="text-gray-600">
                                Expires {String(method.expiryMonth).padStart(2, '0')}/{String(method.expiryYear % 100).padStart(2, '0')}
                              </p>
                            </label>
                          </div>
                        ))}
                        <div className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3">
                          <RadioGroupItem value="new" id="saved-card-new" className="mt-1" />
                          <label htmlFor="saved-card-new" className="flex-1 cursor-pointer text-sm text-gray-700">
                            Use a new card
                          </label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <p className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        You haven&apos;t saved any cards yet. Fill in the details below and check &quot;Save this card&quot; to reuse it later.
                      </p>
                    )}
                  </div>
                )}

                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={handlePaymentMethodChange}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded">
                    <RadioGroupItem value="credit-card" id="credit-card" />
                    <Label htmlFor="credit-card" className="flex-grow cursor-pointer">
                      Credit / Debit Card
                    </Label>
                    <div className="flex space-x-1">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">Visa</span>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">MasterCard</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex-grow cursor-pointer">
                      PayPal
                    </Label>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">PayPal</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded">
                    <RadioGroupItem value="payment-apps" id="payment-apps" />
                    <Label htmlFor="payment-apps" className="flex-grow cursor-pointer">
                      Payment Through Apps
                    </Label>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">UPI</span>
                  </div>
                </RadioGroup>

                {formData.paymentMethod === 'credit-card' && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        disabled={isSavedCardSelected}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input
                        id="cardName"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleChange}
                        disabled={isSavedCardSelected}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleChange}
                          disabled={isSavedCardSelected}
                          placeholder="MM/YY"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" name="cvv" value={formData.cvv} onChange={handleChange} placeholder="123" required />
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="save-card"
                        checked={saveCardForLater}
                        onCheckedChange={checked => setSaveCardForLater(checked === true)}
                        disabled={!user || isSavedCardSelected || isSavingPaymentMethod}
                      />
                      <div>
                        <label htmlFor="save-card" className="text-sm">
                          Save this card for future orders
                        </label>
                        {!user && (
                          <p className="text-xs text-gray-500">Log in to save your card securely for next time.</p>
                        )}
                        {isSavedCardSelected && (
                          <p className="text-xs text-gray-500">To save a different card, choose &quot;Use a new card&quot; above.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'payment-apps' && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PAYMENT_APPS.map(app => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handlePaymentAppTileClick(app.id)}
                          className={clsx(
                            'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                            app.id === selectedPaymentAppId
                              ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                              : 'border-gray-200 bg-gray-50 hover:border-brand-400 hover:bg-brand-50'
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{app.label}</span>
                            <Smartphone className="h-4 w-4 text-gray-500" />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{app.description}</p>
                        </button>
                      ))}
                    </div>

                    {selectedPaymentAppId !== 'qr' ? (
                      <div className="rounded-lg border border-dashed border-brand-200 bg-brand-50/50 p-4 space-y-3">
                        <div>
                          <p className="text-sm font-medium text-brand-900">
                            Pay {formatCurrency(totals.total)} with {selectedPaymentApp.label}
                          </p>
                          <p className="text-xs text-brand-700">
                            Tap the button below to continue securely in {selectedPaymentApp.label}.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            onClick={() => handleLaunchPaymentApp(selectedPaymentAppId)}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open {selectedPaymentApp.label}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Having trouble? Choose the QR option above and scan from any UPI app.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-brand-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Scan to pay {formatCurrency(totals.total)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={handleRefreshQr} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Refresh QR
                          </Button>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-lg bg-white p-4 shadow-inner">
                            <QRCode value={upiLink} size={180} />
                          </div>
                          <p className="text-xs text-gray-500 text-center">
                            Use any UPI app to scan this code.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentAppError && (
                      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {paymentAppError}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:gap-3 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setPaymentAppError(null);
                    }}
                  >
                    Back to Shipping
                  </Button>
                  {formData.paymentMethod === 'payment-apps' ? (
                    <Button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={isLoading || isConfirmingPayment}
                      className="flex items-center gap-2 sm:ml-auto"
                    >
                      {isConfirmingPayment ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmed! Finishing order...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm Payment
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading || isSavingPaymentMethod}>
                      {isLoading
                        ? 'Processing...'
                        : isSavingPaymentMethod
                        ? 'Saving card...'
                        : 'Place Order'}
                    </Button>
                  )}
                </div>

                {formData.paymentMethod === 'payment-apps' && (
                  <p className="text-xs text-gray-500 text-center sm:text-sm">
                    We’ll place the order automatically once your payment is confirmed.
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;