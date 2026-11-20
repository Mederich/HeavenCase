import { TermsContent } from '@/components/terms/TermsContent'

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Conditions générales d’utilisation</h1>
      <TermsContent />
    </div>
  )
}
