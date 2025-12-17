"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";

const commonErrors = [
  {
    title: "Invalid API Key (401)",
    symptoms: "Response 401 Unauthorized",
    causes: [
      "API key was copied incorrectly (check for extra spaces)",
      "API key has been revoked",
      "API key has expired",
    ],
    solutions: [
      "Verify the key starts with ctx_",
      "Generate a new key from the dashboard",
      "Copy the full key (it's only shown once on creation)",
    ],
  },
  {
    title: "Rate Limit Exceeded (429)",
    symptoms: "Response 429 Too Many Requests",
    causes: [
      "Too many requests per minute",
      "Monthly token quota exceeded",
    ],
    solutions: [
      "Wait for the reset (check Retry-After header)",
      "Reduce request frequency",
      "Upgrade your plan for higher limits",
    ],
  },
  {
    title: "Connection Timeout",
    symptoms: "Request times out without response",
    causes: [
      "Network connectivity issues",
      "Very large request taking too long",
      "Server temporarily unavailable",
    ],
    solutions: [
      "Check your internet connection",
      "Increase client-side timeout",
      "Reduce context size",
      "Try again in a few moments",
    ],
  },
  {
    title: "Bad Gateway (502)",
    symptoms: "Response 502 from the proxy",
    causes: [
      "Anthropic API is temporarily unavailable",
      "Invalid request format passed through",
    ],
    solutions: [
      "Wait and retry the request",
      "Check Anthropic status page",
      "Verify request body format",
    ],
  },
];

const faqItems = [
  {
    question: "What's the difference with the Anthropic API directly?",
    answer:
      "CtxOpt adds token tracking, usage analytics, and optimization suggestions. The API is 100% compatible with Anthropic - we simply proxy your requests and add metrics. Your prompts and responses pass through unchanged.",
  },
  {
    question: "Are my data and prompts secure?",
    answer:
      "Yes. Requests are transmitted to Anthropic without modification. We only store metadata (token counts, costs, timing) for analytics. We never store your actual prompts or Claude's responses.",
  },
  {
    question: "Can I use multiple API keys?",
    answer:
      "Yes! You can create multiple keys per project for different environments (development, production, CI). Each key tracks usage separately but rolls up to the same project.",
  },
  {
    question: "How do I see my usage?",
    answer:
      "Log in to the dashboard at https://app.ctxopt.com/dashboard to see real-time usage metrics, cost breakdowns, and optimization suggestions.",
  },
  {
    question: "What happens if I exceed my quota?",
    answer:
      "You'll receive a 429 error. Free plan users can wait until the next month or upgrade. Pro users can contact support for temporary limit increases.",
  },
  {
    question: "Is the MCP server required?",
    answer:
      "No, the MCP server is optional. You can use CtxOpt just by changing your API base URL. The MCP server provides additional optimization tools but isn't required for basic usage tracking.",
  },
  {
    question: "Which Claude models are supported?",
    answer:
      "All Claude models available through the Anthropic API are supported: Claude Opus 4, Claude Sonnet 4, Claude 3.5 Haiku, and any future models.",
  },
  {
    question: "Can I use CtxOpt with the Anthropic SDK?",
    answer:
      "Yes! Simply set the base URL to https://api.ctxopt.com/v1 and use your CtxOpt API key. The SDK will work exactly the same way.",
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Troubleshooting</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Solutions to common issues and frequently asked questions.
        </p>
      </div>

      {/* Common Errors */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Common Errors</h2>
        <div className="space-y-6">
          {commonErrors.map((error) => (
            <div key={error.title} className="rounded-lg border p-6">
              <h3 className="mb-2 text-lg font-semibold">{error.title}</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                <span className="font-medium">Symptoms:</span> {error.symptoms}
              </p>

              <div className="mb-4">
                <h4 className="mb-2 text-sm font-medium">Possible Causes:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {error.causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">-</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium">Solutions:</h4>
                <ul className="space-y-1 text-sm">
                  {error.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API Key Issues */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">API Key Checklist</h2>
        <p className="mb-4 text-muted-foreground">
          If your API key isn&apos;t working, verify the following:
        </p>
        <div className="rounded-lg border p-6">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" />
              <span>
                Key starts with{" "}
                <code className="rounded bg-muted px-1">ctx_</code>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" />
              <span>Key is marked as &quot;Active&quot; in the dashboard</span>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" />
              <span>No trailing spaces or newlines when copying</span>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" />
              <span>The associated project still exists</span>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" />
              <span>Key hasn&apos;t been revoked</span>
            </li>
          </ul>
        </div>
      </section>

      {/* MCP Server Issues */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">MCP Server Issues</h2>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">MCP tools not appearing</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Verify the mcp.json file is in the correct location</li>
              <li>- Restart your IDE after configuration changes</li>
              <li>
                - Check that{" "}
                <code className="rounded bg-muted px-1">npx @ctxopt/mcp-server</code>{" "}
                runs without errors
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Permission denied errors</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Try installing globally with sudo: <code className="rounded bg-muted px-1">sudo npm i -g @ctxopt/mcp-server</code></li>
              <li>- Or use npx which doesn&apos;t require global installation</li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Session stats not syncing</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Ensure CTXOPT_API_KEY is set in your mcp.json env section</li>
              <li>- Verify the API key is valid</li>
              <li>- Check your network connection</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">
          Frequently Asked Questions
        </h2>
        <Accordion>
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={index}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionPanel>{item.answer}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Contact Support */}
      <section className="rounded-lg border bg-muted/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">Still Need Help?</h2>
        <p className="mb-4 text-muted-foreground">
          If you couldn&apos;t find a solution to your problem:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <a
              href="https://github.com/ctxopt/ctxopt/issues"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open an issue on GitHub
            </a>
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>
              Email us at{" "}
              <a
                href="mailto:support@ctxopt.com"
                className="text-primary hover:underline"
              >
                support@ctxopt.com
              </a>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
