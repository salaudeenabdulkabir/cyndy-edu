'use client'
export default function PrintButton() { return <button className="print:hidden rounded bg-gold px-5 py-3 font-semibold text-navy" onClick={() => window.print()}>Print / Save as PDF</button> }
