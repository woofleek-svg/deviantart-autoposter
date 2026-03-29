const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { instagramLogger } = require('../utils/logger');

class InstagramService {
  constructor() {
    this.userId = process.env.INSTAGRAM_USER_ID;
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.stateFilePath = process.env.INSTAGRAM_STATE_FILE_PATH || path.join(__dirname, '../state/instagram_state.json');
    this.apiVersion = 'v19.0';
    this.maxRetries = 3;
    this.retryDelay = 5000;
    this.state = {
      accessToken: null,
      expiresAt: 0,
      tokenType: null // 'short' or 'long'
    };
  }

  /**
   * Initialize the Instagram service
   */
  async initialize() {
    try {
      // Create state directory if it doesn't exist
      const stateDir = path.dirname(this.stateFilePath);
      await fs.mkdir(stateDir, { recursive: true });

      // Load existing state
      await this.loadState();

      // If no state exists, bootstrap with env token
      if (!this.state.accessToken && process.env.INSTAGRAM_ACCESS_TOKEN) {
        instagramLogger.info('Bootstrapping with token from environment');
        this.state.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        // Long-lived tokens last ~60 days, set expiration for 59 days
        this.state.expiresAt = Date.now() + (59 * 24 * 60 * 60 * 1000);
        await this.saveState();
      }

      if (this.state.accessToken) {
        const daysUntilExpiry = Math.floor((this.state.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        instagramLogger.info(`Initialized. Token expires in ${daysUntilExpiry} days`);
      } else {
        instagramLogger.warn('No access token configured');
      }

      return true;
    } catch (error) {
      instagramLogger.error('Failed to initialize', { error: error.message });
      throw error;
    }
  }

  /**
   * Load state from file
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf8');
      this.state = JSON.parse(data);
      instagramLogger.debug('State loaded successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        instagramLogger.debug('No existing state file found');
      } else {
        instagramLogger.error('Error loading state', { error: error.message });
      }
    }
  }

  /**
   * Save state to file
   */
  async saveState() {
    try {
      await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
      instagramLogger.debug('State saved successfully');
    } catch (error) {
      instagramLogger.error('Error saving state', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async getValidToken() {
    if (!this.userId) {
      throw new Error('INSTAGRAM_USER_ID not configured');
    }

    if (!this.state.accessToken) {
      throw new Error('No Instagram access token available');
    }

    // Check if token expires in the next 7 days
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);

    if (this.state.expiresAt < sevenDaysFromNow) {
      instagramLogger.info('Token nearing expiration, refreshing...');
      await this.refreshToken();
    }

    return this.state.accessToken;
  }

  /**
   * Refresh the access token (extends existing long-lived token)
   */
  async refreshToken() {
    try {
      instagramLogger.info('Attempting to refresh Instagram token...');

      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.state.accessToken
        }
      });

      const { access_token, expires_in } = response.data;

      this.state.accessToken = access_token;
      this.state.expiresAt = Date.now() + (expires_in * 1000);
      this.state.lastRefreshed = new Date().toISOString();
      this.state.tokenType = 'long';

      await this.saveState();

      const daysUntilExpiry = Math.floor(expires_in / (60 * 60 * 24));
      instagramLogger.info(`Token refreshed successfully. New expiration: ${daysUntilExpiry} days`);

      return access_token;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      instagramLogger.error('Token refresh failed', { error: errorDetails });

      // If refresh fails, try to exchange for a new long-lived token
      if (this.appId && this.appSecret) {
        instagramLogger.warn('Attempting to exchange for new long-lived token...');
        return await this.exchangeForLongLivedToken(this.state.accessToken);
      }

      throw new Error('Failed to refresh Instagram token and no App credentials available for exchange');
    }
  }

  /**
   * Exchange a short-lived or existing token for a new long-lived token
   * This is a fallback when refresh fails or for initial setup
   */
  async exchangeForLongLivedToken(shortLivedToken) {
    if (!this.appId || !this.appSecret) {
      throw new Error('INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET required for token exchange');
    }

    try {
      instagramLogger.info('Exchanging for long-lived token...');

      const response = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.appSecret,
          access_token: shortLivedToken
        }
      });

      const { access_token, expires_in } = response.data;

      this.state.accessToken = access_token;
      this.state.expiresAt = Date.now() + (expires_in * 1000);
      this.state.lastRefreshed = new Date().toISOString();
      this.state.tokenType = 'long';

      await this.saveState();

      const daysUntilExpiry = Math.floor(expires_in / (60 * 60 * 24));
      instagramLogger.info(`Long-lived token obtained. Expires in: ${daysUntilExpiry} days`);

      return access_token;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      instagramLogger.error('Token exchange failed', { error: errorDetails });
      throw new Error('Failed to exchange for long-lived token');
    }
  }

  /**
   * Validate that an image URL is accessible and meets requirements
   */
  async validateImageUrl(url) {
    try {
      const response = await axios.head(url, { timeout: 10000 });
      const contentType = response.headers['content-type'];

      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const contentLength = parseInt(response.headers['content-length'] || '0');
      const maxSize = 8 * 1024 * 1024; // 8MB Instagram limit

      if (contentLength > maxSize) {
        throw new Error(`Image too large: ${contentLength} bytes (max: ${maxSize})`);
      }

      instagramLogger.debug('Image URL validated', { url, contentType, size: contentLength });
      return true;
    } catch (error) {
      instagramLogger.error('Image validation failed', { url, error: error.message });
      throw error;
    }
  }

  /**
   * Convert tags to Instagram hashtags
   */
  tagsToHashtags(tags) {
    if (!tags || tags.length === 0) return [];

    return tags
      .map(tag => {
        // Convert to lowercase, remove spaces and special chars
        const cleaned = tag
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9_]/g, '');
        return cleaned ? `#${cleaned}` : null;
      })
      .filter(tag => tag !== null)
      .slice(0, 30); // Instagram max 30 hashtags
  }

  /**
   * Sanitize caption for Instagram requirements
   */
  sanitizeCaption(caption) {
    const maxLength = 2200;
    const maxHashtags = 30;

    let sanitized = caption.substring(0, maxLength);

    // Count hashtags
    const hashtags = sanitized.match(/#\w+/g) || [];
    if (hashtags.length > maxHashtags) {
      // Remove excess hashtags
      const hashtagsToKeep = hashtags.slice(0, maxHashtags);
      const lastHashtag = hashtagsToKeep[hashtagsToKeep.length - 1];
      const lastIndex = sanitized.lastIndexOf(lastHashtag);
      sanitized = sanitized.substring(0, lastIndex + lastHashtag.length);
    }

    return sanitized;
  }

  /**
   * Create a media container
   */
  async createMediaContainer(imageUrl, caption, token) {
    try {
      const response = await axios.post(
        `https://graph.instagram.com/${this.userId}/media`,
        {
          image_url: imageUrl,
          caption: this.sanitizeCaption(caption),
          access_token: token
        }
      );

      instagramLogger.debug('Media container created', { containerId: response.data.id });
      return response.data.id;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      instagramLogger.error('Failed to create media container', { error: errorDetails });
      throw error;
    }
  }

  /**
   * Check the status of a media container
   */
  async checkContainerStatus(containerId, token) {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/${containerId}`,
        {
          params: {
            fields: 'status_code',
            access_token: token
          }
        }
      );
      return response.data.status_code;
    } catch (error) {
      instagramLogger.warn('Failed to check container status', { containerId, error: error.message });
      return 'IN_PROGRESS';
    }
  }

  /**
   * Wait for media container to be processed
   */
  async waitForMediaProcessing(containerId, token, maxWait = 60000) {
    const startTime = Date.now();
    const checkInterval = 5000;

    instagramLogger.info('⏳ Waiting for media processing...');

    while (Date.now() - startTime < maxWait) {
      const status = await this.checkContainerStatus(containerId, token);

      if (status === 'FINISHED') {
        instagramLogger.debug('Media processing complete', { containerId });
        // Add grace period after FINISHED status to ensure media is fully ready
        instagramLogger.debug('Waiting 3 seconds for Instagram to finalize media...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      }

      if (status === 'ERROR') {
        throw new Error('Media processing failed');
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Media processing timeout');
  }

  /**
   * Publish a media container
   */
  async publishMedia(containerId, token) {
    try {
      const response = await axios.post(
        `https://graph.instagram.com/${this.userId}/media_publish`,
        {
          creation_id: containerId,
          access_token: token
        }
      );

      instagramLogger.debug('Media published', { postId: response.data.id });
      return response.data.id;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      instagramLogger.error('Failed to publish media', { error: errorDetails });
      throw error;
    }
  }

  /**
   * Post artwork to Instagram
   */
  async postArtwork(artwork) {
    if (!this.userId || !this.state.accessToken) {
      throw new Error('Instagram not configured');
    }

    try {
      instagramLogger.info(`📤 Posting new artwork: "${artwork.title}" by ${artwork.author}`);

      // Determine which image URL to use - try preview before thumbnail for better quality
      let imageUrl = artwork.src;

      // Try to validate the primary image URL
      try {
        await this.validateImageUrl(imageUrl);
      } catch (error) {
        // If primary image fails (too large), try preview first, then thumbnail
        if (error.message.includes('too large')) {
          if (artwork.preview && artwork.preview !== imageUrl) {
            instagramLogger.warn(`Primary image too large (${error.message}), trying preview for "${artwork.title}"`);
            imageUrl = artwork.preview;
            try {
              await this.validateImageUrl(imageUrl);
            } catch (previewError) {
              // If preview also fails, fall back to thumbnail
              if (artwork.thumbnail) {
                instagramLogger.warn(`Preview also too large, using thumbnail for "${artwork.title}"`);
                imageUrl = artwork.thumbnail;
                await this.validateImageUrl(imageUrl);
              } else {
                throw previewError;
              }
            }
          } else if (artwork.thumbnail && artwork.thumbnail !== imageUrl) {
            instagramLogger.warn(`Primary image too large, using thumbnail for "${artwork.title}"`);
            imageUrl = artwork.thumbnail;
            await this.validateImageUrl(imageUrl);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Get valid token
      const token = await this.getValidToken();

      // Generate caption with DeviantArt description and tags
      let captionParts = [];

      // Add title
      captionParts.push(artwork.title);

      // Add description if available
      if (artwork.description && artwork.description.trim()) {
        captionParts.push(''); // blank line
        captionParts.push(artwork.description.trim());
      }

      // Add attribution
      captionParts.push('');
      captionParts.push(`By ${artwork.author}`);

      // Add links
      captionParts.push('');
      captionParts.push(`🔗 Original: ${artwork.originalUrl}`);
      captionParts.push(`🎨 More art: ${process.env.FRONTEND_URL || 'https://your-domain.com'}`);

      // Add hashtags from DeviantArt tags
      const hashtags = this.tagsToHashtags(artwork.tags || []);
      if (hashtags.length > 0) {
        captionParts.push('');
        captionParts.push(hashtags.join(' '));
      }

      const caption = captionParts.join('\n');

      // Create media container
      const containerId = await this.createMediaContainer(imageUrl, caption, token);

      // Wait for processing
      await this.waitForMediaProcessing(containerId, token);

      // Publish media
      const postId = await this.publishMedia(containerId, token);

      instagramLogger.info(`✅ Successfully posted: "${artwork.title}" (Post ID: ${postId})`);

      return {
        success: true,
        postId,
        platform: 'instagram'
      };

    } catch (error) {
      instagramLogger.error(`❌ Failed to post artwork: "${artwork.title}"`, { error: error.message });
      return {
        success: false,
        error: error.message,
        platform: 'instagram'
      };
    }
  }

  /**
   * Check if Instagram is configured
   */
  isConfigured() {
    return !!(this.userId && this.state.accessToken);
  }

  /**
   * Get service status
   */
  getStatus() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Instagram not configured'
      };
    }

    const daysUntilExpiry = Math.floor((this.state.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    const hasAppCredentials = !!(this.appId && this.appSecret);

    return {
      configured: true,
      userId: this.userId,
      tokenExpiresIn: `${daysUntilExpiry} days`,
      lastRefreshed: this.state.lastRefreshed || 'Never',
      tokenType: this.state.tokenType || 'unknown',
      hasAppCredentials: hasAppCredentials,
      autoRenewCapable: hasAppCredentials
    };
  }

  /**
   * Manually trigger token refresh (for testing or manual intervention)
   */
  async manualRefresh() {
    instagramLogger.info('Manual token refresh triggered');
    return await this.refreshToken();
  }
}

module.exports = InstagramService;