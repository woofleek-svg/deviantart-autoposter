import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="comic-card bg-dusty-red text-paper text-center">
          <h2 className="text-3xl text-comic mb-4">
            The Madness Has Corrupted Everything!
          </h2>
          <p className="text-newsprint mb-4">
            Something went horribly wrong while summoning the artwork. 
            The digital demons have escaped their containers!
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-slime-green text-ink font-comic px-6 py-3 border-4 border-ink shadow-comic hover:bg-toxic-orange transition-colors"
          >
            Attempt Resurrection
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left bg-ink text-paper p-4 font-mono text-xs">
              <summary className="cursor-pointer text-comic text-slime-green mb-2">
                Debug Info (Dev Mode)
              </summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary