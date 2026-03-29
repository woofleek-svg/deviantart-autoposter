import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import ErrorBoundary from './components/ErrorBoundary'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </ErrorBoundary>
        </main>
        {/* Decorative ink stains */}
        <div className="fixed top-10 left-10 w-32 h-32 ink-stain opacity-20 pointer-events-none"></div>
        <div className="fixed bottom-20 right-20 w-40 h-24 ink-stain opacity-15 pointer-events-none"></div>
        <div className="fixed top-1/2 left-1/4 w-20 h-20 ink-stain opacity-10 pointer-events-none"></div>
      </div>
    </Router>
  )
}

export default App