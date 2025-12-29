"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";

const locales = [
  { code: "fr", name: "FR", fullName: "Français" },
  { code: "en", name: "EN", fullName: "English" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const currentLang = (params.lang as string) || "fr";

  const switchLanguage = (newLang: string) => {
    if (newLang === currentLang) return;

    let newPath: string;

    if (currentLang === "fr") {
      // French (default) -> English: add /en prefix
      newPath = `/${newLang}${pathname}`;
    } else {
      // English -> French: remove /en prefix
      newPath = pathname.replace(/^\/en/, "") || "/";
    }

    router.push(newPath);
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
        aria-label="Change language"
      >
        <Languages size={16} />
        <span className="uppercase">{currentLang}</span>
      </button>

      <div className="absolute right-0 top-full mt-1 py-1 bg-[#1a1714] border border-[#f4cf8b]/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[120px]">
        {locales.map((locale) => (
          <button
            key={locale.code}
            onClick={() => switchLanguage(locale.code)}
            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
              currentLang === locale.code
                ? "text-[#f4cf8b] bg-[#f4cf8b]/5"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {locale.fullName}
          </button>
        ))}
      </div>
    </div>
  );
}
