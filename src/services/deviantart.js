// DeviantArt oEmbed API service
const DEVIANTART_OEMBED_URL = 'https://backend.deviantart.com/oembed';

/**
 * Fetch oEmbed data for a DeviantArt URL
 * @param {string} url - DeviantArt artwork URL
 * @param {object} options - Additional options (width, height, format)
 * @returns {Promise<object>} oEmbed data
 */
export async function fetchDeviantArtEmbed(url, options = {}) {
  try {
    const params = new URLSearchParams({
      url: url,
      format: options.format || 'json',
      ...(options.maxwidth && { maxwidth: options.maxwidth }),
      ...(options.maxheight && { maxheight: options.maxheight })
    });

    const response = await fetch(`${DEVIANTART_OEMBED_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`DeviantArt oEmbed API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to our expected format
    return {
      id: extractIdFromUrl(url),
      src: data.url || data.thumbnail_url,
      thumbnail: data.thumbnail_url,
      title: data.title || 'Untitled Madness',
      author: data.author_name || 'Unknown Artist',
      authorUrl: data.author_url,
      width: data.width,
      height: data.height,
      html: data.html,
      originalUrl: url,
      description: `By ${data.author_name || 'Unknown Artist'}`,
      type: data.type || 'photo'
    };
  } catch (error) {
    console.error('Error fetching DeviantArt embed:', error);
    throw new Error(`Failed to load artwork: ${error.message}`);
  }
}

/**
 * Fetch multiple DeviantArt embeds
 * @param {string[]} urls - Array of DeviantArt URLs
 * @param {object} options - Options for embed
 * @returns {Promise<object[]>} Array of embed data
 */
export async function fetchMultipleEmbeds(urls, options = {}) {
  try {
    const promises = urls.map(url => fetchDeviantArtEmbed(url, options));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  } catch (error) {
    console.error('Error fetching multiple embeds:', error);
    return [];
  }
}

/**
 * Extract artwork ID from DeviantArt URL
 * @param {string} url - DeviantArt URL
 * @returns {string} Artwork ID
 */
function extractIdFromUrl(url) {
  // Extract ID from various DeviantArt URL formats
  const match = url.match(/art\/.*-(\d+)/) || url.match(/deviation\/(\d+)/);
  return match ? match[1] : url.split('/').pop();
}

/**
 * Validate if URL is a DeviantArt artwork URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid DeviantArt URL
 */
export function isValidDeviantArtUrl(url) {
  const deviantartPatterns = [
    /^https?:\/\/(www\.)?deviantart\.com\/[\w-]+\/art\/[\w-]+-\d+$/,
    /^https?:\/\/[\w-]+\.deviantart\.com\/art\/[\w-]+-\d+$/,
    /^https?:\/\/fav\.me\/[\w-]+$/
  ];
  
  return deviantartPatterns.some(pattern => pattern.test(url));
}

/**
 * Fetches the entire gallery for a given DeviantArt username
 * Calls our secure backend proxy server
 * @param {string} username - The DeviantArt username
 * @param {object} options - Options like limit, offset
 * @returns {Promise<object>} Gallery data with results array
 */
export async function fetchArtistGallery(username, options = {}) {
  try {
    const { limit = 24, offset = 0 } = options;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await fetch(`${backendUrl}/api/gallery/${encodeURIComponent(username)}?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Artist not found in the DeviantArt dimension!');
      }
      throw new Error(`Backend server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching artist gallery:', error);
    throw new Error(`Failed to load gallery: ${error.message}`);
  }
}

/**
 * Fetch user profile information
 * @param {string} username - DeviantArt username
 * @returns {Promise<object>} User profile data
 */
export async function fetchUserProfile(username) {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/user/${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found');
      }
      throw new Error(`Backend server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Test backend server connection
 * @returns {Promise<object>} Server status
 */
export async function testBackendConnection() {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Backend connection test failed:', error);
    throw new Error(`Cannot connect to backend server: ${error.message}`);
  }
}

/**
 * Configuration for different embed sizes
 */
export const embedSizes = {
  thumbnail: { maxwidth: 200, maxheight: 200 },
  medium: { maxwidth: 400, maxheight: 400 },
  large: { maxwidth: 800, maxheight: 600 },
  slideshow: { maxwidth: 1000, maxheight: 700 }
};

// Legacy support - keep existing oEmbed functions for backward compatibility
/**
 * Create a sample artwork configuration
 * This is what you'll replace with real DeviantArt URLs
 */
export const sampleArtworkUrls = [
  // Replace these with actual DeviantArt URLs
  'https://www.deviantart.com/username/art/artwork-title-123456789',
  'https://www.deviantart.com/username/art/another-artwork-987654321',
  // Add more URLs here...
];