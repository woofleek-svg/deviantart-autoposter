import { useState, useEffect } from 'react';
import { fetchArtistGallery } from '../services/deviantart';

/**
 * Custom hook for fetching an entire DeviantArt user's gallery
 * @param {string} username - DeviantArt username
 * @param {object} options - Options like limit, offset
 * @returns {object} { artworks, loading, error, refetch, hasMore, loadMore }
 */
export function useDeviantArtGallery(username, options = {}) {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const limit = options.limit || 24;

  const fetchGallery = async (newOffset = 0, append = false) => {
    if (!username) {
      setLoading(false);
      return;
    }

    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const result = await fetchArtistGallery(username, { 
        limit, 
        offset: newOffset 
      });

      if (append) {
        setArtworks(prev => [...prev, ...result.results]);
      } else {
        setArtworks(result.results);
      }
      
      setHasMore(result.hasMore);
      setOffset(result.nextOffset || newOffset + limit);
      
    } catch (err) {
      console.error('Error in useDeviantArtGallery hook:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchGallery(0, false);
  }, [username, limit]);

  const refetch = () => {
    setOffset(0);
    fetchGallery(0, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGallery(offset, true);
    }
  };

  return {
    artworks,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
    loadingMore
  };
}

/**
 * Hook for fetching user profile information
 * @param {string} username - DeviantArt username
 * @returns {object} { profile, loading, error, refetch }
 */
export function useDeviantArtProfile(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const { fetchUserProfile } = await import('../services/deviantart');
        const profileData = await fetchUserProfile(username);
        setProfile(profileData);
        
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const refetch = () => {
    if (username) {
      fetchProfile();
    }
  };

  return {
    profile,
    loading,
    error,
    refetch
  };
}

export default useDeviantArtGallery;