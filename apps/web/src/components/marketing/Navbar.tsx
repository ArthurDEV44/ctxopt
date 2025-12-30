"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { APP_NAME } from '../constants';
import { Menu, X, Github } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarTranslations {
  links: NavLink[];
}

const translations: Record<string, NavbarTranslations> = {
  fr: {
    links: [
      { label: "À propos", href: "/about" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  en: {
    links: [
      { label: "About", href: "/about" },
      { label: "Documentation", href: "/docs" },
    ],
  },
};

const Navbar: React.FC = () => {
  const params = useParams();
  const lang = (params.lang as string) || 'fr';
  const t = (translations[lang] || translations.fr)!;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prefix links with language for English
  const getLocalizedHref = (href: string) => {
    if (lang === 'en' && !href.startsWith('/en')) {
      return `/en${href}`;
    }
    return href;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-[#040303]/80 backdrop-blur-md py-4'
          : 'bg-transparent py-6'
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href={lang === 'en' ? '/en' : '/'} className="flex items-center gap-2 cursor-pointer group">
          <Image
            src="/distill-logo.png"
            alt="Distill - Token optimization for LLMs"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-xl font-bold tracking-tight text-white">{APP_NAME}</span>
        </Link>

        {/* Desktop Links */}
        <div className="flex items-center gap-8 max-sm:hidden">
          {t.links.map((link: NavLink) => (
            <Link
              key={link.label}
              href={getLocalizedHref(link.href)}
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 max-sm:hidden">
          <LanguageSwitcher />
          <a
            href="https://github.com/ArthurDEV44/distill"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="Distill on GitHub - opens in new tab"
          >
            <Github size={20} aria-hidden="true" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="sm:hidden text-neutral-400 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="sm:hidden absolute top-full left-0 right-0 bg-[#040303] border-b border-[#f4cf8b]/10 p-6 flex flex-col gap-4"
          aria-label="Mobile navigation"
        >
          {t.links.map((link: NavLink) => (
            <Link
              key={link.label}
              href={getLocalizedHref(link.href)}
              className="text-base font-medium text-neutral-300 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#f4cf8b]/10">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </nav>
  );
};

export default Navbar;
