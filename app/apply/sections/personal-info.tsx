'use client'
import { WORLD_COUNTRIES } from '@/lib/countries'

import { useUser } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAutoSave, useWizard } from '../wizard-context'

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, 'Last name is required'),
  gender: z.string().min(1, 'Select your gender'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address'),
  homeAddress: z.string().trim().min(3, 'Home address is required'),
  city: z.string().trim().min(2, 'City is required'),
  postalCode: z.string().trim().optional(),
  country: z.string().min(1, 'Select your country'),
})
type PersonalInfoForm = z.infer<typeof schema>

const inputClass = 'w-full rounded-lg border border-border bg-white px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-dim'

export default function PersonalInfo() {
  const { setIsDirty, initialData } = useWizard()
  const { user } = useUser()
  const { register, watch, formState: { errors } } = useForm<PersonalInfoForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: user?.firstName ?? '', middleName: '', lastName: user?.lastName ?? '', gender: '', dateOfBirth: '', phone: user?.primaryPhoneNumber?.phoneNumber ?? '', email: user?.primaryEmailAddress?.emailAddress ?? '', homeAddress: '', city: '', postalCode: '', country: '', ...Object.fromEntries(Object.entries(initialData).filter(([key]) => key in schema.shape)) },
  })
  const formData = watch()
  const saveStatus = useAutoSave(formData)


  return (
    <div className="space-y-8">
      <div><h1 className="mb-2 font-heading text-3xl font-bold text-navy">Personal Information</h1><p className="text-text-secondary">Tell us about yourself. Fields marked with <span className="text-danger">★</span> are required.</p></div>
      {saveStatus === 'failed' && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">Your changes could not be saved. Please check your connection and try again.</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {([
          ['firstName', 'First name', 'text', 'John', true],
          ['middleName', 'Middle name', 'text', 'David', false],
          ['lastName', 'Last name', 'text', 'Smith', true],
          ['dateOfBirth', 'Date of birth', 'date', '', true],
          ['phone', 'Phone number', 'tel', '+234 800 000 0000', true],
          ['email', 'Email', 'email', 'you@example.com', true],
          ['homeAddress', 'Home address', 'text', '123 Main Street', true],
          ['city', 'City', 'text', 'Lagos', true],
          ['postalCode', 'Postal code', 'text', '101001', false],
        ] as const).map(([name, label, type, placeholder, required]) => (
          <label key={name} className={`block ${name === 'email' || name === 'homeAddress' ? 'sm:col-span-2' : ''}`}>
            <span className="mb-2 block text-sm font-semibold text-text-secondary">{label} {required && <span className="text-danger">★</span>}</span>
            <input type={type} placeholder={placeholder} {...register(name, { onChange: () => setIsDirty(true) })} className={inputClass} />
            {errors[name]?.message && <span className="mt-1 block text-xs text-danger">{errors[name].message}</span>}
          </label>
        ))}
        <label className="block"><span className="mb-2 block text-sm font-semibold text-text-secondary">Gender <span className="text-danger">★</span></span><select {...register('gender', { onChange: () => setIsDirty(true) })} className={inputClass}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer-not">Prefer not to say</option></select>{errors.gender?.message && <span className="mt-1 block text-xs text-danger">{errors.gender.message}</span>}</label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-text-secondary">Country <span className="text-danger">★</span></span><select {...register('country', { onChange: () => setIsDirty(true) })} className={inputClass}><option value="">Select country</option>{WORLD_COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}<option value="other">Other</option></select>{errors.country?.message && <span className="mt-1 block text-xs text-danger">{errors.country.message}</span>}</label>
      </div>
    </div>
  )
}
