import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
  title?: string
}

/** Keeps one failing section (e.g. a Convex query error) from blanking the whole app. */
export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // Convex prefixes errors with "[CONVEX Q(fn)] [Request ID: …]"; keep the request id visible for support.
    const firstLine = String(error.message).split('\n')[0]
    return (
      <div className="mx-auto my-10 max-w-lg rounded-xl border bg-card p-6 text-center shadow-xs">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold">{this.props.title ?? 'This section failed to load'}</h3>
        <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{firstLine}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-4 inline-flex h-8 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium shadow-xs hover:bg-accent"
        >
          <RotateCw className="size-4" /> Try again
        </button>
      </div>
    )
  }
}
