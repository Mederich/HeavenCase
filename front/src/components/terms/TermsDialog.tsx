import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TermsContent } from './TermsContent'

/** CGU dans une modale : le formulaire en cours reste intact. */
export function TermsDialog({ trigger, onAccept }: { trigger: ReactNode; onAccept?: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Conditions générales d’utilisation</DialogTitle>
          <DialogDescription className="sr-only">Texte des conditions générales d’utilisation</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <TermsContent />
        </div>
        {onAccept && (
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={onAccept}>J’accepte</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
