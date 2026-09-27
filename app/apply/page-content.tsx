'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardProvider, useWizard } from './wizard-context'
import { MobileWizardNav, WizardSidebar, WizardHeader } from './sidebar'
import OpportunityPayment from './opportunity-payment'
import PersonalInfo from './sections/personal-info'
import EducationBackground from './sections/education-background'
import DocumentUpload from './sections/document-upload'
import ReviewSubmit from './sections/review-submit'
import Guardians from './sections/guardians'
import ResearchExperience from './sections/research'
import OptionalExperience from './sections/optional-experience'
import Experience from './sections/experience'

const SECTIONS_COMPONENTS = [
  OpportunityPayment,
  () => <div className="space-y-10"><PersonalInfo /><DocumentUpload section="personal" /><Guardians /></div>,
  () => <div className="space-y-10"><EducationBackground /><DocumentUpload section="academic" /><ResearchExperience /></div>,
  Experience,
  () => <><OptionalExperience title="Languages" description="List languages and your proficiency level." fields={[{ key: 'language', label: 'Language' }, { key: 'proficiency', label: 'Proficiency' }]} /><DocumentUpload section="language" /></>,
  () => <><h1 className="text-3xl font-bold text-navy">Other documents</h1><p className="mt-3 text-text-secondary">Admissions tests and other supporting documents are listed below when your opportunity requires them. You can save and continue while gathering missing documents.</p><DocumentUpload section="admissions" /><DocumentUpload section="supporting" /></>,
  ReviewSubmit,
]

function WizardContent() {
  const { currentSection, setCurrentSection, isSaving } = useWizard()
  const CurrentSection = SECTIONS_COMPONENTS[currentSection]

  return (
    <div className="ml-0 min-h-screen pb-8 pt-4 md:ml-64">
      <div className="mx-auto max-w-3xl p-5 md:p-8">
        {CurrentSection && <CurrentSection />}
        {currentSection < 6 && <div className="mt-8 flex items-center justify-between gap-4 border-t pt-6"><button disabled={currentSection===0 || isSaving} onClick={()=>setCurrentSection(currentSection-1)} className="rounded-lg border px-5 py-3 disabled:opacity-40">Back</button><button disabled={isSaving} onClick={()=>setCurrentSection(currentSection+1)} className="rounded-lg bg-navy px-6 py-3 font-semibold text-white disabled:opacity-50">Save and continue</button></div>}
      </div>
    </div>
  )
}

export function ApplyPageContent() {
  const fetch = usePortalFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [availableApps, setAvailableApps] = useState<Array<{id: string; slot: number; referenceNo: string}>>([])
  const [applicationId, setApplicationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push('/')
      return
    }

    // Create or fetch application
    const initApp = async () => {
      setLoading(true)
      setError('')

      try {

        const listResponse = await fetch('/api/applications')
        if (!listResponse.ok) throw new Error('Unable to load application slots')
        const list = await listResponse.json()
        setAvailableApps(list)
        const selected = new URLSearchParams(window.location.search).get('application')
        if (!selected) { router.replace('/opportunities'); return }
        if (!list.some((item: {id: string}) => item.id === selected)) throw new Error('Application not found. Open it from My applications.')
        setApplicationId(selected)
      } catch (err) {
        console.error('Failed to initialize application:', err)
        setApplicationId('')
        setError(err instanceof Error ? err.message : 'We could not open your application.')
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [isLoaded, isSignedIn, router, fetch])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading your application...</p>
        </div>
      </div>
    )
  }

  if (error || !applicationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-text-primary">We could not open your application</h1>
          <p className="mt-3 text-text-secondary">{error || 'Please try again.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md bg-gold px-5 py-3 font-medium text-navy transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <WizardProvider key={applicationId} applicationId={applicationId}>

      <WizardHeader />
      <WizardSidebar />
      <MobileWizardNav />
      <div className="pt-44 md:pt-16">
      {availableApps.length > 1 && <div className="ml-0 px-5 pt-5 md:ml-64"><label className="text-sm font-semibold">Application<select className="ml-3" value={applicationId} onChange={event => { window.location.href = '/apply?application=' + encodeURIComponent(event.target.value) }}>{availableApps.map(item => <option key={item.id} value={item.id}>{item.referenceNo}</option>)}</select></label></div>}
      <WizardContent />
      </div>

    </WizardProvider>
  )
}
