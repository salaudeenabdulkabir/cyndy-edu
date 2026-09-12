'use client'
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
type SaveStatus = 'saved' | 'saving' | 'failed' | 'idle'
interface WizardContextType {
  currentSection: number; setCurrentSection: (section: number) => void
  applicationId: string; initialData: Record<string, unknown>; referenceNo: string; deadline: string | null
  isDirty: boolean; setIsDirty: (dirty: boolean) => void; isSaving: boolean; saveStatus: SaveStatus
  queueSave: (data: Record<string, unknown>) => void; flushSave: () => Promise<boolean>
}
const WizardContext = createContext<WizardContextType | undefined>(undefined)
export function WizardProvider({ children, applicationId }: { children: ReactNode; applicationId: string }) {
  const [currentSection, navigate] = useState(0)
  const [initialData, setInitialData] = useState<Record<string, unknown>>({})
  const [referenceNo, setReferenceNo] = useState('')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const pending = useRef<Record<string, unknown>>({})
  const running = useRef<Promise<boolean> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const flushSave = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current)
    if (running.current) return running.current
    if (!Object.keys(pending.current).length) return Promise.resolve(true)
    setSaveStatus('saving')
    const drain = async () => {
      try {
        while (Object.keys(pending.current).length) {
          const payload = pending.current
          pending.current = {}
          try {
            const response = await fetch('/api/applications/' + applicationId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const body = await response.json()
            if (!response.ok) throw new Error(body.error || 'Unable to save your changes')
            setInitialData({ ...(body.applicationData ?? {}), programId: body.programId, customCourseText: body.customCourseText })
            setDeadline(body.deadline)
          } catch (failure) {
            pending.current = { ...payload, ...pending.current }
            setSaveStatus('failed'); setIsDirty(true)
            setError(failure instanceof Error ? failure.message : 'Unable to save changes')
            return false
          }
        }
        setSaveStatus('saved'); setIsDirty(false); setError('')
        return true
      } finally { running.current = null }
    }
    running.current = drain()
    return running.current
  }, [applicationId])
  const queueSave = useCallback((data: Record<string, unknown>) => {
    pending.current = { ...pending.current, ...data }
    setIsDirty(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flushSave() }, 1000)
  }, [flushSave])
  useEffect(() => {
    let cancelled = false
    fetch('/api/applications/' + applicationId).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to restore your application')
      if (!cancelled) {
        setInitialData({ ...(body.applicationData ?? {}), programId: body.programId, customCourseText: body.customCourseText })
        setReferenceNo(body.referenceNo); setDeadline(body.deadline); setLoaded(true)
      }
    }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true; clearTimeout(timer.current) }
  }, [applicationId])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])
  const setCurrentSection = async (section: number) => {
    if (section < 0 || section > 15 || section === currentSection) return
    if (isDirty && !Object.keys(pending.current).length) { setError('Save your application choice before changing sections.'); return }
    if (await flushSave()) { navigate(section); window.scrollTo({ top: 0, behavior: 'instant' }) }
  }
  if (!loaded) return <div className="p-8" role="status">{error || 'Restoring your saved application…'}{error && <button className="ml-4 underline" onClick={() => window.location.reload()}>Retry</button>}</div>
  return <WizardContext.Provider value={{ currentSection, setCurrentSection, applicationId, initialData, referenceNo, deadline, isDirty, setIsDirty, isSaving: saveStatus === 'saving', saveStatus, queueSave, flushSave }}>
    {error && <div role="alert" className="fixed top-16 left-0 right-0 z-[60] bg-red-50 p-3 text-center text-danger">{error} {saveStatus === 'failed' && <button onClick={() => void flushSave()} className="underline">Retry saving</button>}</div>}
    {children}
  </WizardContext.Provider>
}
export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) throw new Error('useWizard must be used within WizardProvider')
  return context
}
export function useAutoSave(formData: Record<string, unknown>) {
  const { queueSave, saveStatus } = useWizard()
  const serialized = JSON.stringify(formData)
  const previous = useRef(serialized)
  useEffect(() => {
    if (serialized === previous.current) return
    previous.current = serialized
    queueSave(JSON.parse(serialized))
  }, [serialized, queueSave])
  return saveStatus
}
