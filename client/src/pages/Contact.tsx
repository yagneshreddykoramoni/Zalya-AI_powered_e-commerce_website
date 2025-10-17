import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    detail: '+91 63042 07006',
    description: 'Our stylists are available Monday to Saturday, 9 AM – 7 PM IST.',
  },
  {
    icon: Mail,
    title: 'Email Support',
    detail: 'yagneshreddykoramoni@gmail.com',
    description: 'Drop us a message anytime. We respond within 24 hours.',
  },
  {
    icon: MapPin,
    title: 'Experience Studio',
    detail: 'Zalya HQ, Dundigal, Hyderabad, India',
    description: 'Book an appointment to explore curated collections in person.',
  },
  {
    icon: Clock,
    title: 'Chat Availability',
    detail: 'Daily: 8 AM – 11 PM IST',
    description: 'Use the Arattai Messenger for instant styling advice and order updates.',
  },
];

const Contact: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Header />
    <main className="flex-grow">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Contact Zalya</h1>
            <p className="text-gray-600 mt-4">
              We love hearing from our community. Choose a channel below or send us a message and we will get back soon.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            {contactMethods.map(({ icon: Icon, title, detail, description }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Icon size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                  <p className="text-purple-600 font-medium mt-1">{detail}</p>
                  <p className="text-gray-600 mt-2 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Send us a message</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Share your query or styling request and a member of Team Zalya will reach out with personalized assistance.
            </p>
            <form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Your Name" required aria-label="Your Name" />
                <Input type="email" placeholder="Email Address" required aria-label="Email Address" />
              </div>
              <Input placeholder="Phone Number" aria-label="Phone Number" />
              <Textarea rows={4} placeholder="How can we help you?" aria-label="Message" required />
              <Button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700">
                Submit Message
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-6">
              By submitting this form, you agree to be contacted by Zalya and accept our Privacy Policy.
            </p>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Contact;
