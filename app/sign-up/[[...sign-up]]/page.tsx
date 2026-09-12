import { SignUp } from '@clerk/nextjs'
export default function AuthPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/apply" /></main>
}
