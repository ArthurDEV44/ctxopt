'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Terminal, Zap, Gauge, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import CosmicBackground from './CosmicBackground';
import { useHydrated } from '@/hooks';

const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1,
    },
  },
};

/** Tech indicator component */
function TechIndicator({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-3 group cursor-pointer">
      <div className="p-2 rounded-full bg-white/5 group-hover:bg-tech-accent/10 transition-colors ring-1 ring-white/10 group-hover:ring-tech-accent/50">
        <Icon className="text-neutral-400 group-hover:text-tech-accent transition-colors" size={20} />
      </div>
      <div className="text-center">
        <span className="block text-sm font-semibold text-white">{value}</span>
        <span className="text-[10px] text-neutral-500 tracking-widest font-mono uppercase group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Static content rendered during SSR */
function HeroStatic() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-20 px-4 sm:px-6 overflow-hidden bg-tech-black">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto space-y-10" style={{ opacity: 0 }}>
        {/* Badge */}
        <div className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/5 to-transparent" />
          <span className="flex h-1.5 w-1.5 rounded-full bg-tech-accent animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.8)]"></span>
          <span className="text-[11px] font-semibold text-neutral-300 tracking-[0.2em] uppercase">
            v0.6.0-beta Now Available
          </span>
        </div>

        {/* Title */}
        <div className="relative">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-white mb-2 leading-[1.05] mix-blend-lighten">
            <span className="block text-transparent bg-clip-text bg-linear-to-b from-white via-white to-neutral-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              Extract the essence.
            </span>
            <span className="block text-transparent bg-clip-text bg-linear-to-b from-neutral-200 via-neutral-400 to-neutral-700">
              Save tokens.
            </span>
          </h1>
        </div>

        {/* Description */}
        <p className="max-w-2xl text-lg sm:text-xl text-neutral-400 leading-relaxed font-light tracking-wide">
          <span className="text-white font-medium">Distill</span> compresses LLM context intelligently.
          Get up to <span className="text-tech-accent font-semibold">98% token savings</span> with
          smart file reading, AST extraction, and the TypeScript SDK.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pt-6 w-full justify-center">
          <Button variant="primary" icon={<Terminal size={18} />} href="/docs">
            Get Started
          </Button>
        </div>

        {/* Tech indicators */}
        <div className="pt-16 flex items-center justify-center gap-12" style={{ opacity: 1 }}>
          <TechIndicator icon={Zap} label="Token Savings" value="40-98%" />
          <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
          <TechIndicator icon={Gauge} label="Tools" value="21" />
          <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
          <TechIndicator icon={Sparkles} label="Languages" value="7" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-40 bg-linear-to-t from-tech-black via-tech-black/80 to-transparent pointer-events-none z-20" />
    </section>
  );
}

/** Animated content rendered after hydration */
function HeroAnimated() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-20 px-4 sm:px-6 overflow-hidden bg-tech-black">
      <CosmicBackground />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto space-y-10"
      >
        {/* Badge */}
        <motion.div
          variants={fadeInDown}
          className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md hover:bg-white/5 hover:border-tech-accent/30 transition-all cursor-default overflow-hidden"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/5 to-transparent" />
          <span className="flex h-1.5 w-1.5 rounded-full bg-tech-accent animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.8)]"></span>
          <span className="text-[11px] font-semibold text-neutral-300 tracking-[0.2em] uppercase">
            v0.6.0-beta Now Available
          </span>
        </motion.div>

        {/* Title */}
        <motion.div variants={scaleIn} className="relative">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-white mb-2 leading-[1.05] mix-blend-lighten">
            <span className="block text-transparent bg-clip-text bg-linear-to-b from-white via-white to-neutral-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              Extract the essence.
            </span>
            <span className="block text-transparent bg-clip-text bg-linear-to-b from-neutral-200 via-neutral-400 to-neutral-700">
              Save tokens.
            </span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          variants={fadeInUp}
          className="max-w-2xl text-lg sm:text-xl text-neutral-400 leading-relaxed font-light tracking-wide"
        >
          <span className="text-white font-medium">Distill</span> compresses LLM context intelligently.
          Get up to <span className="text-tech-accent font-semibold">98% token savings</span> with
          smart file reading, AST extraction, and the TypeScript SDK.
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center gap-5 pt-6 w-full justify-center"
        >
          <Button variant="primary" icon={<Terminal size={18} />} href="/docs">
            Get Started
          </Button>
        </motion.div>

        {/* Tech indicators */}
        <motion.div
          variants={fadeIn}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="pt-16 flex items-center justify-center gap-12"
        >
          <TechIndicator icon={Zap} label="Token Savings" value="40-98%" />
          <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
          <TechIndicator icon={Gauge} label="Tools" value="21" />
          <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
          <TechIndicator icon={Sparkles} label="Languages" value="7" />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 w-full h-40 bg-linear-to-t from-tech-black via-tech-black/80 to-transparent pointer-events-none z-20" />
    </section>
  );
}

const Hero = () => {
  const mounted = useHydrated();
  const shouldReduceMotion = useReducedMotion();

  // Render static hidden content during SSR to prevent flash
  if (!mounted) {
    return <HeroStatic />;
  }

  // Skip animations for users who prefer reduced motion
  if (shouldReduceMotion) {
    return (
      <section className="relative flex flex-col items-center justify-center min-h-screen pt-20 px-4 sm:px-6 overflow-hidden bg-tech-black">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto space-y-10">
          <div className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <span className="flex h-1.5 w-1.5 rounded-full bg-tech-accent"></span>
            <span className="text-[11px] font-semibold text-neutral-300 tracking-[0.2em] uppercase">
              v0.6.0-beta Now Available
            </span>
          </div>
          <div className="relative">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-white mb-2 leading-[1.05]">
              <span className="block text-transparent bg-clip-text bg-linear-to-b from-white via-white to-neutral-400">
                Extract the essence.
              </span>
              <span className="block text-transparent bg-clip-text bg-linear-to-b from-neutral-200 via-neutral-400 to-neutral-700">
                Save tokens.
              </span>
            </h1>
          </div>
          <p className="max-w-2xl text-lg sm:text-xl text-neutral-400 leading-relaxed font-light tracking-wide">
            <span className="text-white font-medium">Distill</span> compresses LLM context intelligently.
            Get up to <span className="text-tech-accent font-semibold">98% token savings</span> with
            smart file reading, AST extraction, and the TypeScript SDK.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-5 pt-6 w-full justify-center">
            <Button variant="primary" icon={<Terminal size={18} />} href="/docs">
              Get Started
            </Button>
          </div>
          <div className="pt-16 flex items-center justify-center gap-12 opacity-40 hover:opacity-100 transition-opacity duration-700">
            <TechIndicator icon={Zap} label="Token Savings" value="40-98%" />
            <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
            <TechIndicator icon={Gauge} label="Tools" value="21" />
            <div className="h-12 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
            <TechIndicator icon={Sparkles} label="Languages" value="7" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-40 bg-linear-to-t from-tech-black via-tech-black/80 to-transparent pointer-events-none z-20" />
      </section>
    );
  }

  return <HeroAnimated />;
};

export default Hero;
