import { SignIn } from '@clerk/nextjs'
export default function AuthPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/apply" /></main>
}
