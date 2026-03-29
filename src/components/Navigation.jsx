import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  return (
    <nav className="bg-aged-paper border-b-4 border-ink shadow-comic">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-4xl text-comic text-ink hover:text-slime-green transition-colors">
            {import.meta.env.VITE_ARTIST_DISPLAY_NAME || 'Art Gallery'}
          </Link>
          
          <div className="flex space-x-6">
            <Link 
              to="/gallery"
              className={`text-xl font-comic px-4 py-2 border-2 border-ink transition-all duration-150 ${
                location.pathname === '/' || location.pathname === '/gallery'
                  ? 'bg-slime-green shadow-comic'
                  : 'bg-paper hover:bg-slime-green hover:shadow-comic'
              }`}
            >
              Gallery
            </Link>
            
            <Link 
              to="/contact"
              className={`text-xl font-comic px-4 py-2 border-2 border-ink transition-all duration-150 ${
                location.pathname === '/contact'
                  ? 'bg-toxic-orange shadow-comic'
                  : 'bg-paper hover:bg-toxic-orange hover:shadow-comic'
              }`}
            >
              Contact the Madman
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation