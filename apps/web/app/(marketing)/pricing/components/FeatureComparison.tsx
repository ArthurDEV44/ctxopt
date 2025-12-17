"use client";

type FeatureValue = string | boolean;

interface Feature {
  name: string;
  free: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const FEATURES: Feature[] = [
  { name: "Tokens per month", free: "100K", pro: "10M", enterprise: "100M+" },
  { name: "Projects", free: "3", pro: "20", enterprise: "Unlimited" },
  { name: "API keys per project", free: "2", pro: "10", enterprise: "Unlimited" },
  { name: "Data retention", free: "7 days", pro: "90 days", enterprise: "365 days" },
  { name: "Optimization suggestions", free: true, pro: true, enterprise: true },
  { name: "Data export (CSV)", free: false, pro: true, enterprise: true },
  { name: "Priority support", free: false, pro: true, enterprise: true },
  { name: "Guaranteed SLA", free: false, pro: false, enterprise: true },
  { name: "SSO", free: false, pro: false, enterprise: "Coming soon" },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <svg
        className="mx-auto h-5 w-5 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg
        className="mx-auto h-5 w-5 text-muted-foreground/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  return <span className="text-sm">{value}</span>;
}

export function FeatureComparison() {
  return (
    <section className="container py-16">
      <h2 className="mb-8 text-center text-3xl font-bold">Compare Plans</h2>

      <div className="mx-auto max-w-4xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-4 text-left font-medium">Feature</th>
              <th className="px-4 py-4 text-center font-medium">Free</th>
              <th className="px-4 py-4 text-center font-medium">Pro</th>
              <th className="px-4 py-4 text-center font-medium">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.name} className="border-b">
                <td className="py-4 text-muted-foreground">{feature.name}</td>
                <td className="px-4 py-4 text-center">
                  <FeatureCell value={feature.free} />
                </td>
                <td className="px-4 py-4 text-center bg-primary/5">
                  <FeatureCell value={feature.pro} />
                </td>
                <td className="px-4 py-4 text-center">
                  <FeatureCell value={feature.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
