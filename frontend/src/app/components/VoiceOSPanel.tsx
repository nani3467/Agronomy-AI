'use client'

import React, { useEffect } from 'react'
import { useVoiceOS } from '@/context/VoiceOSContext'

export default function VoiceOSPanel() {
  const {
    buttonState,
    isVoiceOSActive,
    isListening,
    isSpeaking,
    subtitle,
    pendingConfirmation,
    toggleVoiceOS,
    confirmPendingAction,
    cancelPendingAction,
    stopSpeaking,
  } = useVoiceOS()

  // Pressing Escape stops Voice OS or stops current speaking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSpeaking) {
          stopSpeaking()
        } else if (isVoiceOSActive) {
          toggleVoiceOS()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSpeaking, isVoiceOSActive, stopSpeaking, toggleVoiceOS])

  // Configure Button Style & Label strictly per specification:
  // | State      | Button display     |
  // | Idle       | 🎤 Voice OS        |
  // | Listening  | 🎤 Listening...    |
  // | Processing | 🧠 Understanding... |
  // | Executing  | ⚡ Working...       |
  // | Speaking   | 🔊 Speaking...     |
  // | Error      | ⚠️ Try Again       |
  const getButtonContent = () => {
    switch (buttonState) {
      case 'listening':
        return {
          icon: (
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-red-400 animate-ping opacity-75" />
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          ),
          text: 'Listening...',
          className: 'bg-red-500 text-white ring-4 ring-red-300 scale-105 shadow-red-500/30',
        }
      case 'understanding':
        return {
          icon: <span className="text-base animate-pulse">🧠</span>,
          text: 'Understanding...',
          className: 'bg-amber-500 text-white shadow-amber-500/30 ring-2 ring-amber-300',
        }
      case 'executing':
        return {
          icon: <span className="text-base animate-bounce">⚡</span>,
          text: 'Working...',
          className: 'bg-purple-600 text-white shadow-purple-600/30 ring-2 ring-purple-300',
        }
      case 'speaking':
        return {
          icon: (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
              <span className="w-1 h-4 bg-white rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-white rounded-full animate-pulse delay-150" />
            </div>
          ),
          text: 'Speaking...',
          className: 'bg-emerald-600 text-white ring-4 ring-emerald-300 scale-105 shadow-emerald-600/30',
        }
      case 'error':
        return {
          icon: <span className="text-base">⚠️</span>,
          text: 'Try Again',
          className: 'bg-rose-600 text-white shadow-rose-600/30',
        }
      default:
        // Idle state: 🎤 Voice OS with green background
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ),
          text: 'Voice OS',
          className: 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-green-600/30 hover:scale-105',
        }
    }
  }

  const btn = getButtonContent()

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2 max-w-[90vw] sm:max-w-md pointer-events-none">
      {/* ── 1. Minimal Confirmation Pill (if user action requires confirmation or browser permission) ── */}
      {pendingConfirmation && (
        <div className="pointer-events-auto bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-bottom-2 space-y-2">
          <p className="text-xs font-semibold text-slate-100">
            ⚠️ {pendingConfirmation.spokenPrompt}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmPendingAction}
              className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all"
            >
              Yes, Confirm
            </button>
            <button
              onClick={cancelPendingAction}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Minimal Transient Subtitle Feedback Pill (Disappears automatically) ── */}
      {!pendingConfirmation && subtitle && isVoiceOSActive && (
        <div className="pointer-events-auto bg-slate-900/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-slate-700 animate-in fade-in duration-200 font-medium max-w-sm truncate">
          {subtitle}
        </div>
      )}

      {/* ── 3. The Main Floating Voice OS Button (No Chat Interface!) ── */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={toggleVoiceOS}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full font-bold shadow-xl transition-all duration-300 active:scale-95 ${btn.className}`}
          aria-label={isVoiceOSActive ? 'Stop Voice OS' : 'Activate Voice OS'}
          title={isVoiceOSActive ? 'Click to stop Voice OS' : 'Click to start voice controlling website'}
        >
          {btn.icon}
          <span className="text-sm font-extrabold tracking-wide select-none">
            {btn.text}
          </span>
        </button>

        {/* Small Stop Indicator Pill while active */}
        {isVoiceOSActive && (
          <button
            onClick={toggleVoiceOS}
            className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white/80 hover:text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-all"
            title="Click to stop Voice OS"
            aria-label="Stop Voice OS"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
