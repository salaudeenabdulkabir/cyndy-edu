'use client'
import { useEffect, useState } from 'react'
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  useEffect(() => { const listener = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent) }; window.addEventListener('beforeinstallprompt', listener); return () => window.removeEventListener('beforeinstallprompt', listener) }, [])
  if (!prompt) return null
  return <button className="mt-4 rounded-lg border border-gold px-5 py-2 text-sm text-white" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null) }}>Install Cyndy on this device</button>
}
