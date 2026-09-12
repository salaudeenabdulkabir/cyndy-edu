import Link from 'next/link'
export default function ContactPage() {
  const email = process.env.SUPPORT_EMAIL
  return <main className="mx-auto max-w-2xl px-6 py-16"><Link href="/" className="text-sm underline">Back to Cyndy</Link><h1 className="mt-8 font-heading text-4xl font-bold text-navy">Contact our team</h1><p className="mt-5">For application help, payment questions, or privacy requests, contact Cyndy Educational Pathways.</p>
    {email ? <a className="mt-6 inline-block rounded-lg bg-gold px-5 py-3 font-semibold text-navy" href={`mailto:${email}`}>{email}</a> : <p className="mt-6 rounded-lg border p-4">Our support contact will be published before applications open.</p>}
    <p className="mt-6 text-sm text-text-secondary">Include your application reference when you have one. Please do not email passwords, payment-card details, passports or other application documents. Upload documents through your signed-in application.</p>
  </main>
}
