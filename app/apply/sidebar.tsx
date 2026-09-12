'use client'
import { formProgress, missingApplicationFields } from '@/lib/application-policy'

import { useWizard } from './wizard-context'
import { UserButton } from '@clerk/nextjs'
import { Check, GraduationCap, UserRound, BookOpen, Trophy, UsersRound, BriefcaseBusiness, FlaskConical, Newspaper, Presentation, ScrollText, HeartHandshake, Star, Drama, Languages, FileText, ClipboardCheck } from 'lucide-react'

const SECTIONS = [
  { id: 0, name: 'Program Selection', required: true, icon: GraduationCap },
  { id: 1, name: 'Personal Information', required: true, icon: UserRound },
  { id: 2, name: 'Education Background', required: true, icon: BookOpen },
  { id: 3, name: 'Awards & Achievements', required: false, icon: Trophy },
  { id: 4, name: 'Legal Guardians', required: true, icon: UsersRound },
  { id: 5, name: 'Work Experience', required: false, icon: BriefcaseBusiness },
  { id: 6, name: 'Research Experience', required: true, icon: FlaskConical },
  { id: 7, name: 'Publications', required: false, icon: Newspaper },
  { id: 8, name: 'Teaching Experience', required: false, icon: Presentation },
  { id: 9, name: 'Certifications', required: false, icon: ScrollText },
  { id: 10, name: 'Voluntary Experience', required: false, icon: HeartHandshake },
  { id: 11, name: 'Leadership', required: false, icon: Star },
  { id: 12, name: 'Clubs & Associations', required: false, icon: Drama },
  { id: 13, name: 'Languages', required: false, icon: Languages },
  { id: 14, name: 'Document Upload', required: true, icon: FileText },
  { id: 15, name: 'Review & Submit', required: true, icon: ClipboardCheck },
]

export function WizardSidebar() {
  const { currentSection, setCurrentSection, referenceNo, deadline, initialData } = useWizard()
  const missing = missingApplicationFields(initialData)
  const completedSections = new Set<number>([[0, Boolean(initialData.programId || initialData.customCourseText)], [1, !missing.includes('Personal information')], [2, !missing.includes('Education background')], [4, !missing.includes('Legal guardians')], [6, !missing.includes('Research experience')]].filter(([, complete]) => complete).map(([id]) => Number(id)))
  const completionPercent = formProgress(initialData, Boolean(initialData.programId || initialData.customCourseText))

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-64 overflow-y-auto border-r border-border bg-white md:block">
      {/* Progress Block */}
      <div className="sticky top-0 bg-white border-b border-border p-6">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="8"
              strokeDasharray={`${completionPercent * 2.827} 282.7`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="transition-all duration-500"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dy="0.3em"
              className="font-bold text-sm fill-text-primary"
            >
              {completionPercent}%
            </text>
          </svg>
        </div>

        <div className="text-center">
          <p className="font-semibold text-sm text-text-primary mb-1">
            Form details
          </p>
          <p className="text-xs text-text-secondary font-mono">
            {referenceNo}
          </p>
          <div className="mt-3 text-xs text-danger font-medium">
            {deadline ? 'Deadline: ' + deadline : 'Choose a program to see its deadline'}
          </div>
        </div>
      </div>

      {/* Section List */}
      <nav className="p-4 space-y-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setCurrentSection(section.id)}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
              currentSection === section.id
                ? 'bg-gold-dim text-gold border-l-[3px] border-gold'
                : 'text-text-secondary hover:bg-gray-50'
            }`}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-border">
              {completedSections.has(section.id) ? <Check size={14} className="text-success" strokeWidth={1.5} /> : <section.icon size={14} strokeWidth={1.5} />}
            </div>
            <span className="flex-1 truncate">{section.name}</span>
            {section.required && (
              <span className="text-xs text-danger font-bold">★</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export function MobileWizardNav() {
  const { currentSection, setCurrentSection } = useWizard()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 overflow-x-auto border-t border-border bg-white p-3 md:hidden">
      {SECTIONS.map((section) => {
        const Icon = section.icon
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => setCurrentSection(section.id)}
            aria-label={section.name}
            aria-current={currentSection === section.id ? 'step' : undefined}
            className={`flex min-w-12 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs ${currentSection === section.id ? 'bg-gold-dim text-gold' : 'text-text-secondary'}`}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span className="whitespace-nowrap">{section.name}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function WizardHeader() {
  const { saveStatus } = useWizard()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-40 flex items-center px-6">
      <div className="flex-1">
        <h2 className="font-heading text-lg font-bold text-navy">
          Your Application
        </h2>
      </div>

      {/* Auto-save Indicator */}
      <div role="status" aria-live="polite" className="text-sm text-text-secondary">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-gold border-t-transparent animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-success">✓ Saved</span>
        )}
        {saveStatus === 'failed' && (
          <span className="text-danger">⚠ Not saved</span>
        )}
      </div>

      {/* Logout */}
      <div className="ml-4"><a href="/notifications" className="mr-3 text-sm underline">Updates</a><UserButton afterSignOutUrl="/" /></div>
    </header>
  )
}
