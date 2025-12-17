"use client";

import Link from "next/link";

interface PlanCardProps {
  name: string;
  price: number | "Contact us";
  yearlyPrice?: number;
  isAnnual: boolean;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  isLoading?: boolean;
}

export function PlanCard({
  name,
  price,
  yearlyPrice,
  isAnnual,
  features,
  highlighted = false,
  ctaText,
  ctaHref,
  onCtaClick,
  isLoading = false,
}: PlanCardProps) {
  const displayPrice = typeof price === "number"
    ? isAnnual && yearlyPrice ? yearlyPrice : price
    : price;

  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`relative flex flex-col rounded-xl border p-6 ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg scale-105"
          : "bg-background"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}
      {children}
    </div>
  );

  const CtaButton = () => {
    const buttonClasses = `w-full py-3 px-4 rounded-lg font-medium transition-colors ${
      highlighted
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "border hover:bg-muted"
    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`;

    if (ctaHref) {
      return (
        <Link href={ctaHref} className={buttonClasses}>
          {ctaText}
        </Link>
      );
    }

    return (
      <button
        onClick={onCtaClick}
        disabled={isLoading}
        className={buttonClasses}
      >
        {isLoading ? "Loading..." : ctaText}
      </button>
    );
  };

  return (
    <CardWrapper>
      <div className="mb-6">
        <h3 className="text-xl font-bold">{name}</h3>
        <div className="mt-4 flex items-baseline gap-1">
          {typeof displayPrice === "number" ? (
            <>
              <span className="text-4xl font-bold">${displayPrice}</span>
              <span className="text-muted-foreground">/month</span>
            </>
          ) : (
            <span className="text-2xl font-bold">{displayPrice}</span>
          )}
        </div>
        {typeof price === "number" && isAnnual && yearlyPrice && (
          <p className="mt-1 text-sm text-muted-foreground">
            Billed annually (${yearlyPrice * 12}/year)
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <CtaButton />
    </CardWrapper>
  );
}
