import React from 'react';
import Navbar from '@/components/marketing/Navbar';
import Hero from '@/components/marketing/HeroSection';
import Stats from '@/components/marketing/Stats';
import NoiseOverlay from '@/components/marketing/NoiseOverlay';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-obsidian text-white selection:bg-indigo-500/30 selection:text-white relative">
      <NoiseOverlay />

      {/* Background Gradients for general ambiance */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <Stats />
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm">
          © 2026 CtxOpt Inc. Built for the future of AI.
        </p>
      </footer>
    </div>
  );
}
