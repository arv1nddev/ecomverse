/**
 * ErrorBoundary – catches uncaught render errors and shows a friendly fallback
 * instead of a white screen. Wrap the router root in main.tsx.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    return { hasError: true, message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging; replace with a real logger if added later.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
    // Navigate home so the app re-mounts cleanly
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
        >
          <p className="text-5xl font-bold text-neutral-200">!</p>
          <h1 className="text-xl font-bold text-neutral-900">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-neutral-500">
            {this.state.message}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Go back home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
