"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does the monthly quota work?",
    answer:
      "Your token quota resets on the 1st of each month. Unused tokens do not roll over to the next month. You can monitor your usage in real-time from the dashboard.",
  },
  {
    question: "What happens if I exceed my quota?",
    answer:
      "When you reach your monthly limit, your requests will be blocked until the quota resets. You can upgrade to a higher plan at any time for immediate access to more tokens.",
  },
  {
    question: "Can I change my plan at any time?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to the new limits. When downgrading, the change takes effect at the start of your next billing cycle.",
  },
  {
    question: "How are tokens counted?",
    answer:
      "We count both input and output tokens according to Anthropic's tokenization. The exact count is shown in your dashboard and in the API response headers for full transparency.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "The Free plan is free forever with 100K tokens/month. This allows you to fully test CtxOpt before deciding to upgrade. No credit card required to get started.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) through Polar.sh, our secure payment processor. VAT is handled automatically based on your location.",
  },
  {
    question: "How does billing work?",
    answer:
      "Polar.sh acts as our Merchant of Record, handling all billing, VAT compliance, and invoicing. You'll receive a proper invoice that complies with your local tax regulations.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 14-day money-back guarantee for Pro subscriptions. If you're not satisfied, contact us within 14 days of purchase for a full refund.",
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b">
      <button
        className="flex w-full items-center justify-between py-4 text-left"
        onClick={onToggle}
      >
        <span className="font-medium">{item.question}</span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4 text-muted-foreground">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="container py-16">
      <h2 className="mb-8 text-center text-3xl font-bold">Frequently Asked Questions</h2>

      <div className="mx-auto max-w-2xl">
        {FAQ_ITEMS.map((item, index) => (
          <FAQAccordion
            key={index}
            item={item}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </section>
  );
}
