'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function DiseasesRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const crop = searchParams.get('crop') || searchParams.get('plant') || ''
    const disease = searchParams.get('disease') || ''
    const params = new URLSearchParams()
    if (crop && crop !== 'All') params.set('crop', crop)
    if (disease) params.set('disease', disease)
    const q = params.toString()
    router.replace(q ? `/crops?${q}` : '/crops')
  }, [router, searchParams])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-3 border-[#16A34A] border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-extrabold text-slate-800">Redirecting to Crop Guides & Pathology...</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-md">
        All disease intelligence has been unified directly into our comprehensive Crop Guides. You are being redirected...
      </p>
    </div>
  )
}

export default function DiseasesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Redirecting...</div>}>
      <DiseasesRedirect />
    </Suspense>
  )
}
