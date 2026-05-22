"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Bike, ShieldCheck, Clock, MapPin } from "lucide-react";

export default function RidersPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-md w-full" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center">
          <button onClick={() => router.back()} className="text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors mr-4">
            <ChevronLeft size={22} />
          </button>
          <span className="text-white text-lg sm:text-xl font-bold tracking-wide">Vito Riders</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white px-4 py-16 sm:py-24 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bike size={40} className="text-green-700" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            Deliver with Vito
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Join our fleet of dedicated delivery partners. Earn on your own schedule, explore your city, and bring joy to customers every day.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">Why ride with us?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={28} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Hours</h3>
            <p className="text-gray-500 leading-relaxed">
              You&apos;re the boss. Choose when and how much you want to work. Whether it&apos;s a few hours a week or full-time.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={28} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Reliable Earnings</h3>
            <p className="text-gray-500 leading-relaxed">
              Get paid for every delivery you complete. Track your earnings easily and cash out securely.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin size={28} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Local Support</h3>
            <p className="text-gray-500 leading-relaxed">
              We&apos;re here for you. Our dedicated support team is available to help you with any issues while on the road.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-700 py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to hit the road?</h2>
          <p className="text-green-100 mb-8 text-lg">
            Sign up today and start earning. All you need is a smartphone and a vehicle.
          </p>
          <button 
            onClick={() => alert("Registration coming soon!")}
            className="bg-white text-green-800 font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-green-50 hover:scale-105 transition-all"
          >
            Apply Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 Vito Delivery. All rights reserved.</p>
      </footer>
    </div>
  );
}
