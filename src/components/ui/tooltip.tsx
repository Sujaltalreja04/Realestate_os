import * as React from 'react'
import * as T from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = T.Provider

export function Tooltip({
  content,
  side = 'right',
  children,
}: {
  content: React.ReactNode
  side?: T.TooltipContentProps['side']
  children: React.ReactNode
}) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={8}
          className={cn('z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md')}
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
