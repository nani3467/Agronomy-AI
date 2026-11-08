'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL, formatApiError, ScanResult } from '@/lib/api'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { useVoiceActions } from '@/hooks/useVoiceActions'

function ReportDetailsContent() {
  const searchParams = useSearchParams()
  const scanId = searchParams.get('id')

  const [report, setReport] = useState<ScanResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scanId) {
      setError('No scan record ID specified. Please scan a plant or choose a report from history.')
      setIsLoading(false)
      return
    }

    const fetchReport = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await axios.get<ScanResult>(`${API_BASE_URL}/scans/${scanId}/`)
        setReport(response.data)
      } catch (err: unknown) {
        setError(formatApiError(err, 'Could not retrieve report. It may have been deleted or the server is offline.'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [scanId])

  const { speak, language } = useVoiceOS()

  useVoiceActions([
    {
      id: 'read_report_summary',
      name: 'Read Diagnostic Report',
      description: 'Voice read full pathology report and remedies',
      intent: 'READ_RESULT',
      keywords_en: ['read report', 'read diagnosis', 'explain report'],
      keywords_te: ['నివేదిక చదువు', 'రిపోర్ట్ చెప్పు'],
      keywords_hi: ['रिपोर्ट पढ़ो', 'निदान बताओ'],
      handler: () => {
        if (report) {
          const text =
            language === 'te'
              ? `రోగ నిర్ధారణ నివేదిక: ${report.disease_name}. ఖచ్చితత్వం: ${report.accuracy} శాతం. పరిస్థితి: ${report.status}. ఆర్గానిక్ చికిత్స: ${report.organic_treatment}.`
              : language === 'hi'
              ? `निदान रिपोर्ट: ${report.disease_name}। सटीकता: ${report.accuracy} प्रतिशत। स्थिति: ${report.status}। जैविक उपचार: ${report.organic_treatment}।`
              : `Agricultural Diagnostic Report: ${report.disease_name} with ${report.accuracy}% accuracy. Status: ${report.status}. Organic treatment: ${report.organic_treatment}.`
          speak(text)
        }
      },
    },
    {
      id: 'print_report',
      name: 'Print Report',
      description: 'Open browser print dialog for report',
      intent: 'CLICK_ELEMENT',
      keywords_en: ['print report', 'print this'],
      keywords_te: ['ప్రింట్ చేయి'],
      keywords_hi: ['प्रिंट करो'],
      handler: () => handlePrint(),
    },
  ])

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!report) return

    const rows = [
      ['Agronamy Agricultural Diagnostic Report'],
      ['Report ID', report.id],
      ['Date Analyzed', report.created_at ? new Date(report.created_at).toISOString() : new Date().toISOString()],
      ['Disease Pathology', report.disease_name],
      ['Plant Status', report.status],
      ['AI Model Accuracy', `${report.accuracy}%`],
      ['Symptoms Observed', report.symptoms || ''],
      ['Pathogen & Cause', report.causes || ''],
      ['Transmission Route', report.spread || ''],
      ['Organic Treatment', report.organic_treatment || ''],
      ['Chemical Treatment', report.chemical_treatment || ''],
      ['Safety Precautions', report.safety_precautions || ''],
      ['Long-term Prevention', report.prevention || ''],
      ['Crop Damage Risk', report.crop_damage || ''],
    ]

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Agronamy-Report-${report.id.slice(0, 8)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    if (!report) return

    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 18
    const maxTextWidth = pageWidth - 2 * margin
    let y = 22

    // Header Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(21, 128, 61) // Green-700
    doc.text('Agronamy — Plant Pathology Diagnosis', margin, y)
    y += 8

    // Date & ID
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    const dateStr = report.created_at ? new Date(report.created_at).toLocaleString() : new Date().toLocaleString()
    doc.text(`Report ID: ${report.id}  •  Generated: ${dateStr}`, margin, y)
    y += 10

    // Summary Card Box
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, maxTextWidth, 26, 3, 3, 'FD')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`Diagnosis: ${report.disease_name}`, margin + 5, y + 8)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Status: ${report.status}  |  Confidence Score: ${report.accuracy}%`, margin + 5, y + 16)
    doc.text('Model Architecture: MobileNetV2 Deep CNN (PlantVillage 38 Classes)', margin + 5, y + 22)
    y += 34

    // Section Function Helper
    const addSection = (title: string, content?: string) => {
      if (!content) return
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text(title, margin, y)
      y += 6

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      const lines = doc.splitTextToSize(content, maxTextWidth)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 6
    }

    addSection('1. Observed Symptoms', report.symptoms)
    addSection('2. Pathogen & Causes', report.causes)
    addSection('3. Transmission & Spread', report.spread)
    addSection('4. Organic Biological Treatment', report.organic_treatment)
    addSection('5. Chemical Treatment & Safety Precautions', `${report.chemical_treatment} \n\nSafety Guidelines: ${report.safety_precautions || 'Wear PPE gear (gloves, goggles, mask) and adhere to pre-harvest intervals.'}`)
    addSection('6. Long-Term Prevention Practices', report.prevention)
    addSection('7. Crop Damage & Economic Impact', report.crop_damage)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'Agronamy • Empowering farmers with AI-driven plant diagnostics and food security analytics.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )

    doc.save(`Agronamy-Diagnosis-${report.id.slice(0, 8)}.pdf`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Loading diagnostic report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-gray-900">Report Unavailable</h2>
          <p className="text-xs text-gray-600">{error || 'Could not find this scan record.'}</p>
          <div className="pt-2 flex justify-center gap-2">
            <Link
              href="/scanning"
              className="px-5 py-2 rounded-full bg-green-600 text-white font-bold text-xs shadow-sm"
            >
              Scan a Plant
            </Link>
            <Link
              href="/history"
              className="px-5 py-2 rounded-full border border-gray-200 text-gray-700 font-semibold text-xs"
            >
              Back to History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-gray-50 to-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Controls Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-green-700"
          >
            &larr; Back to Scan History
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs"
            >
              📊 Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm"
            >
              📄 Download PDF
            </button>
          </div>
        </div>

        {/* Printable Diagnostic Report Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl border border-gray-100 space-y-8">
          {/* Header */}
          <div className="border-b border-gray-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    report.status === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {report.status}
                </span>
                <span className="text-xs text-gray-600">
                  {report.created_at ? new Date(report.created_at).toLocaleString() : 'Recent analysis'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {report.disease_name}
              </h1>
              <p className="text-xs text-gray-600 font-mono mt-1">
                Record ID: {report.id}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-2xl border border-green-200 text-right">
              <span className="text-[10px] uppercase font-bold text-gray-600 block">
                Confidence Accuracy
              </span>
              <span className="text-2xl font-black text-green-700">
                {report.accuracy}%
              </span>
            </div>
          </div>

          {/* Uploaded Leaf Image */}
          {report.image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-100 max-h-72 bg-gray-50 text-center">
              <img
                src={report.image_url}
                alt={report.disease_name}
                className="max-h-72 mx-auto object-contain"
              />
            </div>
          )}

          {/* Section 1: Symptoms */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-green-800 flex items-center gap-2">
              <span>🔍 1. Symptoms & Pathology</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {report.symptoms || 'Visible discoloration, concentric lesions, or abnormal leaf spotting observed on foliage.'}
            </p>
          </div>

          {/* Section 2: Causes and Spread */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <strong className="text-xs font-bold uppercase tracking-wider text-gray-800 block">
                🦠 Primary Pathogen & Cause:
              </strong>
              <p className="text-xs text-gray-600 leading-relaxed">
                {report.causes || 'Microbial or fungal pathogen triggered by high humidity and temperature.'}
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <strong className="text-xs font-bold uppercase tracking-wider text-gray-800 block">
                💨 Transmission Vectors:
              </strong>
              <p className="text-xs text-gray-600 leading-relaxed">
                {report.spread || 'Dispersed by rain splash, wind currents, and mechanical tools.'}
              </p>
            </div>
          </div>

          {/* Section 3: Organic Treatment */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-green-800 flex items-center gap-2">
              <span>🌿 2. Organic Biological Treatment</span>
            </h3>
            <div className="text-xs sm:text-sm text-green-900 leading-relaxed bg-green-50/70 p-4 rounded-2xl border border-green-200">
              {report.organic_treatment}
            </div>
          </div>

          {/* Section 4: Chemical Treatment & Safety */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-2">
              <span>🧪 3. Chemical Treatment & Safety Precautions</span>
            </h3>
            <div className="space-y-3 bg-blue-50/60 p-5 rounded-2xl border border-blue-200 text-xs sm:text-sm text-blue-900">
              <p className="leading-relaxed">{report.chemical_treatment}</p>
              {report.safety_precautions && (
                <div className="pt-3 border-t border-blue-200 text-xs text-blue-800">
                  <strong className="text-blue-950 block mb-0.5">⚠️ Handler Safety Guidelines:</strong>
                  {report.safety_precautions}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Long-Term Prevention */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
              <span>🛡️ 4. Cultural & Field Prevention Practices</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
              {report.prevention || 'Maintain crop rotation schedules, sanitize pruning shears, and water roots using drip tape.'}
            </p>
          </div>

          {/* Section 6: Crop Damage */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-2">
              <span>⚠️ 5. Crop Damage & Yield Impact</span>
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              {report.crop_damage || 'Defoliation diminishes photosynthesis, reducing fruit weight and marketable harvest.'}
            </p>
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-gray-100 text-center text-xs text-gray-600">
            Agronamy Agricultural Intelligence System • Generated via PyTorch MobileNetV2 Neural Network
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    }>
      <ReportDetailsContent />
    </Suspense>
  )
}
