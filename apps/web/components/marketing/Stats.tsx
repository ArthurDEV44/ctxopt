'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { FileCode, Zap, Cpu, LucideIcon } from 'lucide-react';
import { useHydrated } from '@/hooks';

interface Feature {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
}

const features: Feature[] = [
  {
    Icon: FileCode,
    title: 'AST-Aware Parsing',
    subtitle: '7 LANGUAGES SUPPORTED',
    description: 'Extract functions, classes, and types from code files with intelligent AST parsing. Supports TypeScript, JavaScript, Python, Go, Rust, PHP, and Swift.',
  },
  {
    Icon: Zap,
    title: 'Smart Compression',
    subtitle: 'UP TO 98% SAVINGS',
    description: 'Auto-detect content type and apply optimal compression. Build outputs, logs, diffs, and code are intelligently processed to minimize token usage.',
  },
  {
    Icon: Cpu,
    title: 'TypeScript SDK',
    subtitle: 'ONE TOOL, MANY OPERATIONS',
    description: 'Execute complex multi-step operations with a single tool call. Chain file reads, AST extraction, and compression in sandboxed TypeScript code.',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

/** Feature card component (static, animations handled by parent) */
function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="group relative h-full p-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md hover:bg-white/3 hover:border-tech-accent/30 transition-all duration-500 overflow-hidden">
      {/* Scanline effect on hover */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-tech-accent/3 to-transparent -translate-y-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

      {/* Icon with glow effect */}
      <div className="relative mb-8 inline-flex items-center justify-center">
        <div className="absolute inset-0 bg-tech-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />
        <div className="relative z-10 text-neutral-400 group-hover:text-tech-accent transition-colors duration-300 transform group-hover:-translate-y-1">
          <feature.Icon size={28} />
        </div>
      </div>

      {/* Text content */}
      <div className="relative space-y-4">
        <span className="inline-block text-[10px] font-mono text-tech-accent/60 uppercase tracking-widest border-b border-transparent group-hover:border-tech-accent/30 transition-all pb-1">
          {feature.subtitle}
        </span>
        <h3 className="text-xl font-semibold text-white group-hover:text-tech-accent/90 transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-neutral-400 leading-relaxed font-light group-hover:text-neutral-300 transition-colors">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

/** Static version rendered during SSR (hidden) */
function FeaturesStatic() {
  return (
    <section className="relative py-32 px-6 bg-tech-black overflow-hidden" style={{ opacity: 0 }}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-tech-accent/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col items-center mb-20 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(34,211,238,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-[0.2em] text-tech-accent uppercase">
              Core Features
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Why use <span className="text-transparent bg-clip-text bg-linear-to-br from-white via-neutral-200 to-neutral-500">Distill?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Animated version rendered after hydration */
function FeaturesAnimated() {
  return (
    <section className="relative py-32 px-6 bg-tech-black overflow-hidden">
      {/* Nebula / Cosmic dust background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-tech-accent/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="flex flex-col items-center mb-20 text-center space-y-4">
          <motion.div
            variants={badgeVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(34,211,238,0.15)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-[0.2em] text-tech-accent uppercase">
              Core Features
            </span>
          </motion.div>

          <motion.h2
            variants={titleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white"
          >
            Why use <span className="text-transparent bg-clip-text bg-linear-to-br from-white via-neutral-200 to-neutral-500">Distill?</span>
          </motion.h2>
        </div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <FeatureCard feature={feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const Features = () => {
  const mounted = useHydrated();
  const shouldReduceMotion = useReducedMotion();

  // Render static hidden content during SSR to prevent flash
  if (!mounted) {
    return <FeaturesStatic />;
  }

  // Skip animations for users who prefer reduced motion
  if (shouldReduceMotion) {
    return (
      <section className="relative py-32 px-6 bg-tech-black overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-tech-accent/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center mb-20 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(34,211,238,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse"></span>
              <span className="text-[10px] font-mono tracking-[0.2em] text-tech-accent uppercase">
                Core Features
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
              Why use <span className="text-transparent bg-clip-text bg-linear-to-br from-white via-neutral-200 to-neutral-500">Distill?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return <FeaturesAnimated />;
};

export default Features;
