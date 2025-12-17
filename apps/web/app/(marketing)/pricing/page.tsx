"use client";

import { useState } from "react";
import Link from "next/link";
import { PricingHero } from "./components/PricingHero";
import { PricingCards } from "./components/PricingCards";
import { FeatureComparison } from "./components/FeatureComparison";
import { SavingsCalculator } from "./components/SavingsCalculator";
import { PricingFAQ } from "./components/PricingFAQ";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Hero */}
      <PricingHero isAnnual={isAnnual} onToggle={setIsAnnual} />

      {/* Pricing Cards */}
      <PricingCards isAnnual={isAnnual} />

      {/* Feature Comparison */}
      <FeatureComparison />

      {/* Savings Calculator */}
      <SavingsCalculator />

      {/* FAQ */}
      <PricingFAQ />

      {/* Final CTA */}
      <section className="border-t py-16">
        <div className="container text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Optimize Your LLM Costs?</h2>
          <p className="mb-8 text-xl text-muted-foreground">
            Start free and upgrade when you need more power.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
            </Link>
            <Link
              href="mailto:enterprise@ctxopt.dev"
              className="inline-flex h-12 items-center justify-center rounded-md border px-8 text-lg font-medium hover:bg-muted"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
