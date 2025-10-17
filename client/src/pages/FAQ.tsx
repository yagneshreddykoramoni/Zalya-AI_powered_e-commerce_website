import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const faqItems = [
  {
    question: 'How does Zalya personalize my shopping experience?',
    answer:
      'Our recommendation engine analyzes your browsing patterns, past purchases, and saved preferences to surface products that match your unique style. You can fine-tune suggestions anytime from your profile settings.',
  },
  {
    question: 'Can I track my orders in real time?',
    answer:
      'Yes. Visit the Orders page to view current status, shipment updates, and digital invoices. We send push and email notifications at every milestone.',
  },
  {
    question: 'What payment methods does Zalya accept?',
    answer:
      'We support major credit and debit cards, UPI, and select digital wallets. All transactions are secured with multi-layer encryption.',
  },
  {
    question: 'How do I contact customer support?',
    answer:
      'Reach out via the Contact page, live chat, or email us at support@zalya.com. Our stylists and support specialists respond within 24 hours.',
  },
];

const FAQ: React.FC = () => {

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow">
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
              <p className="text-gray-600 mt-4">
                Answers to common questions about shopping with Zalya. Still curious? Our support team is here to help.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-10">
            {faqItems.map((item) => (
              <div key={item.question} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900">{item.question}</h2>
                <p className="text-gray-600 mt-3 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
