import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const shippingPolicies = [
  {
    title: 'Processing & Dispatch',
    description:
      'Orders are processed within 24 hours on business days. You will receive a confirmation email with tracking details once your package leaves our fulfillment center.',
  },
  {
    title: 'Domestic Delivery Timelines',
    description:
      'Standard shipping delivers within 3-5 business days in metro cities and 5-7 days in other regions. Express shipping options are available during checkout for faster delivery.',
  },
  {
    title: 'International Shipping',
    description:
      'Zalya ships to over 40 countries. Customs duties and taxes may apply based on your destination and are payable by the recipient upon delivery.',
  },
];

const returnPolicies = [
  {
    title: 'Hassle-Free Returns',
    description:
      'Items can be returned within 15 days of delivery if they are unworn, unwashed, and include original tags. Initiate a return request from your Orders page.',
  },
  {
    title: 'Refund Processing',
    description:
      'After we inspect the returned item, refunds are processed within 5-7 business days to the original payment method. Store credit is available on request.',
  },
  {
    title: 'Exchange Support',
    description:
      'Need a different size or color? Choose the exchange option during return initiation and we will reserve the replacement item for you immediately.',
  },
];

const ShippingReturns: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Header />
    <main className="flex-grow">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Shipping &amp; Returns</h1>
            <p className="text-gray-600 mt-4">
              Everything you need to know about delivery timelines, return eligibility, and exchanges at Zalya.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto grid gap-10">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Shipping Information</h2>
            <div className="space-y-6">
              {shippingPolicies.map((policy) => (
                <div key={policy.title} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900">{policy.title}</h3>
                  <p className="text-gray-600 mt-3 leading-relaxed">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Returns &amp; Exchanges</h2>
            <div className="space-y-6">
              {returnPolicies.map((policy) => (
                <div key={policy.title} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900">{policy.title}</h3>
                  <p className="text-gray-600 mt-3 leading-relaxed">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default ShippingReturns;
