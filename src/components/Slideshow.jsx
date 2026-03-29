import { useState, useEffect } from 'react'

function Slideshow({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % images.length)
      }, 4000)
      
      return () => clearInterval(interval)
    }
  }, [images.length])

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length)
  }

  if (images.length === 0) {
    return (
      <div className="comic-card bg-murky-green text-center">
        <h2 className="text-3xl text-comic text-paper mb-4">No Madness Found!</h2>
        <p className="text-newsprint text-paper text-lg">The artist's creations are still brewing...</p>
      </div>
    )
  }

  return (
    <div className="relative mb-12">
      {/* Main slideshow container */}
      <div className="comic-border bg-ink p-4 transform -rotate-1">
        <div className="relative overflow-hidden bg-paper h-96 md:h-[500px]">
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image.src || image.thumbnail}
                alt={image.title || `Artwork ${index + 1}`}
                className="w-full h-full object-contain"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
          
          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-slime-green text-ink font-comic text-2xl w-12 h-12 border-2 border-ink shadow-comic hover:bg-toxic-orange transition-colors"
              >
                ←
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-slime-green text-ink font-comic text-2xl w-12 h-12 border-2 border-ink shadow-comic hover:bg-toxic-orange transition-colors"
              >
                →
              </button>
            </>
          )}
        </div>
        
        {/* Image info */}
        {images[currentIndex] && (
          <div className="bg-aged-paper p-4 border-t-2 border-ink">
            <h3 className="text-2xl text-comic text-ink mb-2">
              {images[currentIndex].title || `Untitled Madness #${currentIndex + 1}`}
            </h3>
            {images[currentIndex].description && (
              <p className="text-newsprint text-ink">
                {images[currentIndex].description}
              </p>
            )}
            {images[currentIndex].author && (
              <p className="text-xs text-comic text-murky-green mt-2">
                by {images[currentIndex].author}
              </p>
            )}
            {images[currentIndex].originalUrl && (
              <a
                href={images[currentIndex].originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 bg-slime-green text-ink font-comic px-3 py-1 border-2 border-ink shadow-comic hover:bg-toxic-orange text-sm"
              >
                View on DeviantArt
              </a>
            )}
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex justify-center mt-6 space-x-3">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-4 h-4 border-2 border-ink transition-colors ${
                index === currentIndex 
                  ? 'bg-slime-green shadow-comic' 
                  : 'bg-paper hover:bg-toxic-orange'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Slideshow