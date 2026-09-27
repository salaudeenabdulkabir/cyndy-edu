'use client'
import { useEffect, useRef, useState } from 'react'
import { formProgress, missingApplicationFields } from '@/lib/application-policy'

import { useWizard } from './wizard-context'
import { UserButton } from '@clerk/nextjs'
import { Check, GraduationCap, UserRound, BookOpen, BriefcaseBusiness, Languages, FileText, ClipboardCheck } from 'lucide-react'

const SECTIONS = [
  { id: 0, name: 'Opportunity & Payment', required: true, icon: GraduationCap },
  { id: 1, name: 'Personal & Family', required: true, icon: UserRound },
  { id: 2, name: 'Academic Background', required: true, icon: BookOpen },
  { id: 3, name: 'Experience', required: false, icon: BriefcaseBusiness },
  { id: 4, name: 'Languages', required: false, icon: Languages },
  { id: 5, name: 'Other Documents', required: true, icon: FileText },
  { id: 6, name: 'Review & Submit', required: true, icon: ClipboardCheck },
]

export function WizardSidebar() {
  const { currentSection, setCurrentSection, referenceNo, deadline, initialData } = useWizard()
  const missing = missingApplicationFields(initialData)
  const completedSections = new Set<number>([[0, Boolean(initialData.programId || initialData.customCourseText)], [1, !missing.includes('Personal information') && !missing.includes('Legal guardians')], [2, !missing.includes('Education background') && !missing.includes('Research experience')]].filter(([, complete]) => complete).map(([id]) => Number(id)))
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
                ? 'bg-gold-dim text-navy border-l-[3px] border-gold'
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
  const [open,setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(()=>{ if(open) dialog.current?.showModal(); else if(dialog.current?.open) dialog.current.close() },[open])
  return <div className="fixed left-0 right-0 top-16 z-40 md:hidden">
    <div className="border-b bg-white px-5 py-3"><button ref={trigger} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="rounded-lg border px-4 py-2 text-sm font-semibold">☰ Sections · {currentSection+1} of {SECTIONS.length}</button><p className="mt-2 text-sm text-text-secondary">{SECTIONS[currentSection].name}</p></div>
    <dialog ref={dialog} aria-label="Application sections" onClose={()=>{setOpen(false);trigger.current?.focus()}} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-r bg-white p-0 backdrop:bg-black/40">
      <div className="flex items-center justify-between border-b p-5"><h2 className="font-bold">Application sections</h2><button onClick={()=>setOpen(false)} className="rounded border px-3 py-2" aria-label="Close sections">✕</button></div>
      <nav className="space-y-1 p-3">{SECTIONS.map(section=><button key={section.id} onClick={()=>{setCurrentSection(section.id);setOpen(false)}} aria-current={currentSection===section.id ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm ${currentSection===section.id ? 'bg-gold-dim font-semibold text-navy' : 'text-text-secondary'}`}><section.icon size={18}/>{section.name}</button>)}</nav>
      <a href="/support" className="m-5 block underline">Help with your application</a>
    </dialog>
  </div>
}

export function WizardHeader() {
  const { saveStatus } = useWizard()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-40 flex items-center px-6">
      <div className="flex-1">
        <a href="/opportunities" className="text-xs underline">My applications</a><h2 className="font-heading text-lg font-bold text-navy">
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
