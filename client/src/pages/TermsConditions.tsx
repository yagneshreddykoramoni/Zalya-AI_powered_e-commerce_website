import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using Zalya, you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, please discontinue using the platform immediately.',
  },
  {
    title: '2. Account Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us promptly of any unauthorized use.',
  },
  {
    title: '3. Product Information & Availability',
    content:
      'We strive for accuracy in descriptions, pricing, and availability, but errors may occur. Zalya reserves the right to correct inaccuracies or cancel orders affected by such errors.',
  },
  {
    title: '4. Intellectual Property',
    content:
      'All content, including product imagery, logos, and UI elements, is owned by Zalya or its partners. You may not reuse or distribute this content without prior written consent.',
  },
  {
    title: '5. Limitation of Liability',
    content:
      'To the fullest extent permitted by law, Zalya is not liable for indirect, incidental, or consequential damages arising from the use of our services or products.',
  },
];

const TermsConditions: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Header />
    <main className="flex-grow">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Terms &amp; Conditions</h1>
            <p className="text-gray-600 mt-4">
              Understand the policies that govern your experience on Zalya. We keep these terms transparent so you can shop with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section) => (
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

export default TermsConditions;
