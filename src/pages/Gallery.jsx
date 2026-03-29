import { useState } from 'react'
import Slideshow from '../components/Slideshow'
import { useDeviantArtGallery } from '../hooks/useDeviantArtGallery'
import { ARTIST_CONFIG } from '../config/artist'
import { testBackendConnection } from '../services/deviantart'

function Gallery() {
  // Fetch the artist's full gallery automatically
  const {
    artworks: allArtworks,
    loading: galleryLoading,
    error: galleryError,
    refetch,
    hasMore,
    loadMore,
    loadingMore
  } = useDeviantArtGallery(ARTIST_CONFIG.username, { 
    limit: ARTIST_CONFIG.initialLimit 
  })

  // Split artworks: first few for slideshow, rest for gallery
  const slideshowArtworks = allArtworks.slice(0, ARTIST_CONFIG.featuredCount)
  const galleryArtworks = allArtworks.slice(ARTIST_CONFIG.featuredCount)

  const [selectedImage, setSelectedImage] = useState(null)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl text-comic text-ink mb-4 transform -rotate-2">
          {ARTIST_CONFIG.displayName} Gallery
        </h1>
        <p className="text-xl text-newsprint text-faded-blue max-w-2xl mx-auto">
          Welcome to the twisted mind palace where sanity comes to die and art comes to life. 
          Enter if you dare, leave if you can!
        </p>
        {galleryError && (
          <div className="mt-6">
            <button
              onClick={refetch}
              className="bg-toxic-orange text-ink font-comic px-4 py-2 border-2 border-ink shadow-comic hover:bg-slime-green"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>

      {/* Loading/Error States */}
      {galleryLoading && (
        <div className="comic-card bg-murky-green text-center mb-12">
          <h2 className="text-3xl text-comic text-paper mb-4">Summoning Artwork from DeviantArt...</h2>
          <div className="animate-spin w-12 h-12 border-4 border-paper border-t-slime-green rounded-full mx-auto"></div>
          <p className="text-newsprint text-paper mt-4">
            Connecting to {ARTIST_CONFIG.username}'s gallery...
          </p>
        </div>
      )}
      
      {galleryError && (
        <div className="comic-card bg-dusty-red text-paper text-center mb-12">
          <h2 className="text-3xl text-comic mb-4">Gallery Portal Malfunction!</h2>
          <p className="text-newsprint mb-4">{galleryError}</p>
          <div className="space-y-2 text-sm">
            <p>Possible causes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Backend server isn't running</li>
              <li>DeviantArt API credentials missing</li>
              <li>Username '{ARTIST_CONFIG.username}' not found</li>
              <li>Network connectivity issues</li>
            </ul>
          </div>
        </div>
      )}

      {/* Featured Slideshow */}
      {!galleryLoading && !galleryError && slideshowArtworks.length > 0 && (
        <Slideshow images={slideshowArtworks} />
      )}

      {/* Gallery Grid */}
      <div className="mb-12">
        <h2 className="text-4xl text-comic text-ink mb-8 text-center transform rotate-1">
          The Full Asylum Collection
        </h2>
        
        {!galleryLoading && !galleryError && galleryArtworks.length === 0 && allArtworks.length === 0 && (
          <div className="comic-card bg-murky-green text-center">
            <h3 className="text-2xl text-comic text-paper mb-4">No Madness Found!</h3>
            <p className="text-newsprint text-paper">
              The artist's creations are still brewing in the DeviantArt cauldron... 
              Check that '{ARTIST_CONFIG.username}' is the correct username.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryArtworks.map((artwork, index) => (
            <div
              key={artwork.id}
              className={`comic-card cursor-pointer hover:scale-105 transition-transform duration-300 ${
                index % 3 === 0 ? 'transform rotate-2' : 
                index % 3 === 1 ? 'transform -rotate-1' : 'transform rotate-1'
              }`}
              onClick={() => setSelectedImage(artwork)}
            >
              <div className="aspect-square overflow-hidden bg-ink mb-4">
                <img
                  src={artwork.src || artwork.thumbnail}
                  alt={artwork.title}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h3 className="text-xl text-comic text-ink mb-2">
                {artwork.title}
              </h3>
              <p className="text-newsprint text-faded-blue text-sm">
                {artwork.description}
              </p>
              {artwork.author && (
                <p className="text-xs text-comic text-murky-green mt-1">
                  by {artwork.author}
                </p>
              )}
              <button className="mt-4 bg-dusty-red text-paper font-comic px-4 py-2 border-2 border-ink shadow-comic hover:bg-deep-magenta transition-colors">
                Stare Longer!
              </button>
            </div>
          ))}
        </div>
        
        {/* Load More Button */}
        {hasMore && !galleryLoading && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`font-comic text-xl px-8 py-4 border-4 border-ink shadow-comic transition-all duration-150 ${
                loadingMore 
                  ? 'bg-dusty-red text-paper cursor-not-allowed'
                  : 'bg-slime-green text-ink hover:bg-toxic-orange hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
              }`}
            >
              {loadingMore ? 'Summoning More Madness...' : 'Load More Twisted Art!'}
            </button>
          </div>
        )}
      </div>

      {/* Modal for enlarged image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-ink bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="comic-border bg-paper p-6 max-w-4xl max-h-screen overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-3xl text-comic text-ink">
                {selectedImage.title}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-toxic-orange text-ink font-comic text-xl px-4 py-2 border-2 border-ink shadow-comic hover:bg-slime-green"
              >
                Escape!
              </button>
            </div>
            
            <img
              src={selectedImage.src || selectedImage.thumbnail}
              alt={selectedImage.title}
              className="w-full max-h-96 object-contain mb-4"
            />
            
            {selectedImage.author && (
              <p className="text-comic text-murky-green mb-2">
                by {selectedImage.author}
              </p>
            )}
            
            {selectedImage.originalUrl && (
              <a
                href={selectedImage.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-slime-green text-ink font-comic px-3 py-1 border-2 border-ink shadow-comic hover:bg-toxic-orange text-sm mb-4"
              >
                View on DeviantArt
              </a>
            )}
            
            <p className="text-newsprint text-ink text-lg">
              {selectedImage.description}
            </p>
          </div>
        </div>
      )}

      {/* Call to action */}
      <div className="text-center comic-card bg-slime-green">
        <h3 className="text-3xl text-comic text-ink mb-4">
          Want Your Own Piece of Madness?
        </h3>
        <p className="text-newsprint text-ink mb-6 text-lg">
          Commission the mad scientist himself! Prices negotiable, sanity not included.
        </p>
        <a
          href="/contact"
          className="comic-button inline-block"
        >
          Unleash the Chaos!
        </a>
      </div>
    </div>
  )
}

export default Gallery