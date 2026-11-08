'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVoiceOS } from '@/context/VoiceOSContext'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { toggleVoiceOS, isVoiceOSActive, buttonState } = useVoiceOS()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/scanning', label: 'Disease Scanner' },
    { href: '/crop-recommendation', label: 'Crop Recommender' },
    { href: '/crops', label: 'Crop Guides' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/history', label: 'History' },
    { href: '/fertilizer', label: 'Fertilizer' },
    { href: '/how-to-use', label: 'Guide & FAQ' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white transition-all duration-200 border-b border-[#E2E8F0] ${
        scrolled
          ? 'shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-[70px] flex items-center justify-between gap-4">
        {/* ── 1. LEFT SECTION: BRAND LOGO ───────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group focus:outline-none">
          {/* Logo Badge Icon */}
          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#166534] flex items-center justify-center text-white shadow-md shadow-green-600/20 group-hover:scale-105 transition-transform duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5 lg:w-6 lg:h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 3.2C11.6 3.2 4.5 6.8 4.5 13.3c0 3.7 2.7 6.1 6.1 6.1 6.5 0 10.2-7.1 10.2-16.2Z" fill="currentColor" fillOpacity="0.2"/>
            </svg>
          </div>

          {/* Brand Name & Subtitle */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-lg lg:text-xl tracking-tight text-[#111827] group-hover:text-[#16A34A] transition-colors">
                <span className="text-[#16A34A]">Agronomy</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] border border-green-200/80">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium tracking-wide mt-1 leading-none">
              Smart Agriculture Platform
            </p>
          </div>
        </Link>

        {/* ── 2. CENTER SECTION: DESKTOP NAVIGATION ─────────────────────────── */}
        <nav
          aria-label="Main Navigation"
          className="hidden xl:flex items-center justify-center gap-1.5 flex-1 px-4"
        >
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-[13px] 2xl:text-[14px] transition-all duration-150 relative ${
                  active
                    ? 'text-[#166534] bg-[#DCFCE7] font-bold shadow-xs'
                    : 'text-[#334155] hover:text-[#16A34A] hover:bg-slate-50 font-medium'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-[#16A34A] rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── 3. RIGHT SECTION: ACTIONS ─────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Voice OS Quick Toggle Button */}
          <button
            onClick={toggleVoiceOS}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all duration-150 ${
              buttonState === 'listening'
                ? 'bg-red-500 text-white animate-pulse'
                : isVoiceOSActive
                ? 'bg-[#166534] text-white ring-2 ring-green-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200'
            }`}
            aria-label="Toggle Voice OS"
            title={isVoiceOSActive ? "Voice OS Active (Click to stop)" : "Click to activate Voice OS"}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${buttonState === 'listening' ? 'animate-ping bg-red-400' : isVoiceOSActive ? 'animate-pulse bg-emerald-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${buttonState === 'listening' ? 'bg-red-500' : 'bg-[#16A34A]'}`}></span>
            </span>
            <span className="hidden sm:inline">
              {buttonState === 'listening' ? 'Listening...' : 'Voice OS'}
            </span>
          </button>

          {/* Primary CTA: Scan Plant */}
          <Link
            href="/scanning"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm shadow-green-600/30 hover:shadow-md transition-all duration-150 whitespace-nowrap"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan Plant</span>
          </Link>

          {/* Mobile / Tablet Hamburger Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-[#334155] hover:text-[#16A34A] hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── RESPONSIVE MOBILE / TABLET SLIDE-OUT PANEL ──────────────────────── */}
      {isMenuOpen && (
        <div className="xl:hidden bg-white border-t border-[#E2E8F0] shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {/* Menu Links */}
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? 'text-[#166534] bg-[#DCFCE7] font-bold border-l-4 border-[#16A34A]'
                      : 'text-[#334155] hover:text-[#16A34A] hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <span className="text-xs text-[#16A34A]">●</span>}
                </Link>
              )
            })}

            {/* Quick action buttons in drawer */}
            <div className="pt-3 border-t border-[#E2E8F0] flex gap-2">
              <Link
                href="/scanning"
                onClick={() => setIsMenuOpen(false)}
                className="flex-1 text-center py-2.5 px-3 rounded-xl bg-[#16A34A] hover:bg-[#166534] text-white font-bold text-xs shadow-sm"
              >
                📸 Disease Scanner
              </Link>
              <Link
                href="/crop-recommendation"
                onClick={() => setIsMenuOpen(false)}
                className="flex-1 text-center py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[#111827] font-bold text-xs"
              >
                🌾 Crop Advice
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
