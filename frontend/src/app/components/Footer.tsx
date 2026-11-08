import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Column 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#14532D] flex items-center justify-center text-white shadow-md shadow-green-900/40">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl text-white tracking-tight">
                  <span className="text-[#22C55E]">Agronomy</span> AI
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Intelligent Agriculture. Smarter Decisions. Better Harvests.
            </p>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Empowering farmers, agronomists, and researchers with AI-driven plant disease diagnostics, precision crop recommendations, and multilingual voice assistance.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                38 Diseases • 22 Crops
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Gnani AI Voice Powered
              </span>
            </div>
          </div>

          {/* Column 2: Core Tools */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              AI Tools
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/scanning" className="hover:text-emerald-400 transition-colors">
                  Plant Disease Scanner
                </Link>
              </li>
              <li>
                <Link href="/crop-recommendation" className="hover:text-emerald-400 transition-colors">
                  Soil Crop Recommender
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Agronomic Dashboard
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-emerald-400 transition-colors">
                  Scan & Crop History
                </Link>
              </li>
              <li>
                <Link href="/fertilizer" className="hover:text-emerald-400 transition-colors">
                  Fertilizer Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Agricultural Knowledge */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Crop Knowledge
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/crops" className="hover:text-emerald-400 transition-colors">
                  Crop Guides & Plant Diseases
                </Link>
              </li>
              <li>
                <Link href="/crops" className="hover:text-emerald-400 transition-colors">
                  Cultivation Guides (23 Crops)
                </Link>
              </li>
              <li>
                <Link href="/how-to-use" className="hover:text-emerald-400 transition-colors">
                  Diagnostic Guide & FAQ
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
                  How Agronomy AI Works
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Technology & Challenge */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              AI Technology
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                MobileNetV2 CNN (PyTorch)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                RandomForest ML (scikit-learn)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Gnani Prisma STT (Speech-to-Text)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Gnani Timbre TTS (Text-to-Speech)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Django 5.2 & Next.js 14
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Developed for the <span className="text-emerald-400 font-semibold">Great Indian AI Internship Challenge by Gnani AI</span>.
            </div>
          </div>
        </div>

        {/* Agricultural Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} <strong className="text-slate-400">Agronomy AI</strong>. Built for farmers and food security worldwide.
          </p>
          <p className="text-center md:text-right max-w-lg text-[11px] leading-relaxed">
            * Agricultural diagnostic guidance is advisory. For chemical treatments, always verify localized dosage and safety withholding periods with your local regional extension service.
          </p>
        </div>
      </div>
    </footer>
  )
}
