import { useState, useEffect } from 'react';
import { fetchMultipleEmbeds, embedSizes } from '../services/deviantart';

/**
 * Custom hook for fetching DeviantArt artwork embeds
 * @param {string[]} urls - Array of DeviantArt URLs
 * @param {string} size - Size preset (thumbnail, medium, large, slideshow)
 * @returns {object} { artworks, loading, error, refetch }
 */
export function useDeviantArt(urls = [], size = 'medium') {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArtworks = async () => {
    if (!urls.length) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const sizeOptions = embedSizes[size] || embedSizes.medium;
      const results = await fetchMultipleEmbeds(urls, sizeOptions);
      
      setArtworks(results);
    } catch (err) {
      console.error('Error in useDeviantArt hook:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, [urls.join(','), size]); // Re-fetch when URLs or size changes

  const refetch = () => {
    fetchArtworks();
  };

  return {
    artworks,
    loading,
    error,
    refetch
  };
}

/**
 * Hook for fetching a single DeviantArt artwork
 * @param {string} url - DeviantArt URL
 * @param {string} size - Size preset
 * @returns {object} { artwork, loading, error, refetch }
 */
export function useDeviantArtSingle(url, size = 'medium') {
  const { artworks, loading, error, refetch } = useDeviantArt([url], size);
  
  return {
    artwork: artworks[0] || null,
    loading,
    error,
    refetch
  };
}