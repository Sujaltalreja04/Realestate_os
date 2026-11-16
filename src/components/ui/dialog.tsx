import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

const overlay = 'fixed inset-0 z-50 bg-black/40'

export function DialogContent({
  className,
  children,
  title,
  description,
  ...p
}: Omit<React.ComponentProps<typeof D.Content>, 'title'> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-card shadow-lg',
          className,
        )}
        {...p}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-sm text-muted-foreground">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  )
}

/** Right-hand slide-over panel for record details. */
export function SheetContent({
  className,
  children,
  title,
  description,
  actions,
  ...p
}: Omit<React.ComponentProps<typeof D.Content>, 'title'> & { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/30" />
      <D.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-card shadow-xl',
          className,
        )}
        {...p}
      >
        <div className="flex items-start gap-3 border-b px-5 py-4">
          <div className="min-w-0 flex-1">
            <D.Title className="truncate text-base font-semibold">{title}</D.Title>
            <D.Description asChild>
              <div className="mt-0.5 text-sm text-muted-foreground">{description ?? ''}</div>
            </D.Description>
          </div>
          {actions}
          <D.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  )
}
