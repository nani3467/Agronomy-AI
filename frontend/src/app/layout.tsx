import type { Metadata } from 'next'
import './globals.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { VoiceOSProvider } from '@/context/VoiceOSContext'
import VoiceOSPanel from './components/VoiceOSPanel'
import FloatingAIAssistant from './components/FloatingAIAssistant'

export const metadata: Metadata = {
  title: 'Agronamy | AI Plant Disease Detection & Crop Recommender',
  description: 'Agronamy – AI-driven plant pathology detection across 38 disease classes and precision crop recommendation based on real soil chemistry.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif]">
        <VoiceOSProvider>
          <Navbar />
          <main className="flex-1 w-full">
            {children}
          </main>
          <Footer />
          <VoiceOSPanel />
          <FloatingAIAssistant />
        </VoiceOSProvider>
      </body>
    </html>
  )
}

