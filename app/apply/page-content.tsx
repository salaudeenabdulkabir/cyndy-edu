'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardProvider, useWizard } from './wizard-context'
import { MobileWizardNav, WizardSidebar, WizardHeader } from './sidebar'
import { PaymentGate } from './payment-gate'
import ProgramSelection from './sections/program-selection'
import PersonalInfo from './sections/personal-info'
import EducationBackground from './sections/education-background'
import DocumentUpload from './sections/document-upload'
import ReviewSubmit from './sections/review-submit'
import Guardians from './sections/guardians'
import ResearchExperience from './sections/research'
import OptionalExperience from './sections/optional-experience'

const SECTIONS_COMPONENTS = [
  ProgramSelection,
  PersonalInfo,
  EducationBackground,
  () => <OptionalExperience title="Awards & Achievements" description="Add awards and achievements that strengthen your application." fields={[{ key: 'title', label: 'Award title' }, { key: 'body', label: 'Awarding body' }, { key: 'year', label: 'Year', type: 'number' }]} />,
  Guardians,
  () => <OptionalExperience title="Work Experience" description="Add relevant professional experience." fields={[{ key: 'jobTitle', label: 'Job title' }, { key: 'company', label: 'Company' }, { key: 'location', label: 'Location' }, { key: 'period', label: 'Period' }]} />,
  ResearchExperience,
  () => <OptionalExperience title="Publications" description="List publications, articles, or conference papers." fields={[{ key: 'title', label: 'Publication title' }, { key: 'type', label: 'Type' }, { key: 'year', label: 'Year', type: 'number' }, { key: 'link', label: 'DOI or link' }]} />,
  () => <OptionalExperience title="Teaching Experience" description="Add teaching, mentoring, or tutoring experience." fields={[{ key: 'institution', label: 'Institution' }, { key: 'location', label: 'Location' }, { key: 'role', label: 'Role' }, { key: 'period', label: 'Period' }]} />,
  () => <OptionalExperience title="Certifications" description="Add professional or academic certifications." fields={[{ key: 'title', label: 'Certification title' }, { key: 'body', label: 'Awarding body' }, { key: 'date', label: 'Date' }, { key: 'format', label: 'Online or in-person' }]} />,
  () => <OptionalExperience title="Voluntary Experience" description="Add community service and voluntary work." fields={[{ key: 'organization', label: 'Organization' }, { key: 'role', label: 'Role' }, { key: 'period', label: 'Period' }]} />,
  () => <OptionalExperience title="Leadership" description="Add leadership positions and responsibilities." fields={[{ key: 'position', label: 'Position' }, { key: 'organization', label: 'Organization' }, { key: 'years', label: 'Year(s)' }]} />,
  () => <OptionalExperience title="Clubs & Associations" description="Add clubs, societies, and professional associations." fields={[{ key: 'name', label: 'Club or association' }, { key: 'role', label: 'Role' }, { key: 'years', label: 'Year(s)' }]} />,
  () => <OptionalExperience title="Languages" description="List languages and your proficiency level." fields={[{ key: 'language', label: 'Language' }, { key: 'proficiency', label: 'Proficiency' }]} />,
  DocumentUpload,
  ReviewSubmit,
]

function WizardContent() {
  const { currentSection } = useWizard()
  const CurrentSection = SECTIONS_COMPONENTS[currentSection]

  return (
    <div className="ml-0 min-h-screen pb-24 pt-16 md:ml-64 md:pb-8">
      <div className="mx-auto max-w-3xl p-5 md:p-8">
        {CurrentSection && <CurrentSection />}
      </div>
    </div>
  )
}

export function ApplyPageContent() {
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
        const res = await fetch('/api/applications', { method: 'POST' })
        const app = await res.json()

        if (!res.ok || !app?.id) {
          throw new Error(app?.error ?? 'Application initialization failed')
        }

        const listResponse = await fetch('/api/applications')
        if (!listResponse.ok) throw new Error('Unable to load application slots')
        const list = await listResponse.json()
        setAvailableApps(list)
        const selected = new URLSearchParams(window.location.search).get('application')
        setApplicationId(list.some((item: {id: string}) => item.id === selected) ? selected : app.id)
      } catch (err) {
        console.error('Failed to initialize application:', err)
        setApplicationId('')
        setError(err instanceof Error ? err.message : 'We could not open your application.')
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [isLoaded, isSignedIn, router])

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
      <PaymentGate applicationId={applicationId}>
      <WizardHeader />
      <WizardSidebar />
      <MobileWizardNav />
      {availableApps.length > 1 && <div className="ml-0 pt-20 px-5 md:ml-64"><label className="text-sm font-semibold">Application<select className="ml-3" value={applicationId} onChange={event => { window.location.href = '/apply?application=' + encodeURIComponent(event.target.value) }}>{availableApps.map(item => <option key={item.id} value={item.id}>Application {item.slot}: {item.referenceNo}</option>)}</select></label></div>}
      <WizardContent />
      </PaymentGate>
    </WizardProvider>
  )
}
