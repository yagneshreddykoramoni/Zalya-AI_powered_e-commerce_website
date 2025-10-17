import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const privacySections = [
  {
    title: 'Personal Data We Collect',
    content:
      'We collect information you provide directly (such as name, email, and shipping details) and data generated from your interactions with our platform, including browsing history, wishlist activity, and purchase records.',
  },
  {
    title: 'How We Use Your Information',
    content:
      'Your data powers personalized recommendations, order fulfillment, fraud prevention, and customer support. We may send marketing updates, which you can opt out of anytime.',
  },
  {
    title: 'Data Sharing & Third Parties',
    content:
      'We share data only with trusted partners necessary for order processing, payment facilitation, analytics, and logistics. These partners are obligated to protect your information and use it solely for the agreed purpose.',
  },
  {
    title: 'Your Privacy Controls',
    content:
      'You can access, update, or delete your personal data from the Account Settings page. Contact privacy@zalya.com for additional requests or to revoke consent.',
  },
  {
    title: 'Security Measures',
    content:
      'Zalya employs encryption, secure access controls, and periodic security reviews to protect your data. Despite our best efforts, no system is completely immune from risk, so remain vigilant about your credentials.',
  },
];

const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Header />
    <main className="flex-grow">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-gray-600 mt-4">
              We are committed to protecting your data and keeping your shopping experience safe, transparent, and in your control.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {privacySections.map((section) => (
            <div key={section.title} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              <p className="text-gray-600 mt-3 leading-relaxed">{section.content}</p>
            </div>
          ))}
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
