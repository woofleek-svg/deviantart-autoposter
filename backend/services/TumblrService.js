const tumblr = require('tumblr.js');
const { tumblrLogger } = require('../utils/logger');

class TumblrService {
  constructor() {
    this.client = null;
    this.blogName = process.env.TUMBLR_BLOG_NAME;

    // Initialize Tumblr client if credentials are available
    if (process.env.TUMBLR_CONSUMER_KEY &&
        process.env.TUMBLR_CONSUMER_SECRET &&
        process.env.TUMBLR_TOKEN &&
        process.env.TUMBLR_TOKEN_SECRET) {

      this.client = tumblr.createClient({
        consumer_key: process.env.TUMBLR_CONSUMER_KEY,
        consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
        token: process.env.TUMBLR_TOKEN,
        token_secret: process.env.TUMBLR_TOKEN_SECRET,
      });

      tumblrLogger.info('Tumblr client initialized');
    } else {
      tumblrLogger.warn('Tumblr credentials not found');
    }
  }

  /**
   * Initialize the Tumblr service
   */
  async initialize() {
    if (this.client && this.blogName) {
      tumblrLogger.info(`Initialized with blog: ${this.blogName}`);
      return true;
    } else if (!this.client) {
      tumblrLogger.warn('Client not configured');
      return false;
    } else if (!this.blogName) {
      tumblrLogger.warn('TUMBLR_BLOG_NAME not configured');
      return false;
    }
    return false;
  }

  /**
   * Post artwork to Tumblr
   */
  async postArtwork(artwork) {
    if (!this.client) {
      throw new Error('Tumblr client not configured');
    }

    if (!this.blogName) {
      throw new Error('TUMBLR_BLOG_NAME not configured');
    }

    try {
      tumblrLogger.info(`📤 Posting new artwork: "${artwork.title}" by ${artwork.author}`);

      // Build text content with description
      let textContent = artwork.title;

      if (artwork.description && artwork.description.trim()) {
        textContent += `\n\n${artwork.description.trim()}`;
      }

      textContent += `\n\nBy ${artwork.author}`;
      textContent += `\n\nOriginal: ${artwork.originalUrl}`;

      // Create NPF content for the post
      const content = [
        {
          type: 'image',
          media: [
            {
              type: 'image/jpeg',
              url: artwork.src || artwork.thumbnail
            }
          ]
        },
        {
          type: 'text',
          text: textContent
        }
      ];

      // Use DeviantArt tags, with fallback to default tags
      let tags = ['deviantart', 'art'];
      if (artwork.tags && artwork.tags.length > 0) {
        tags = [...tags, ...artwork.tags];
      } else {
        tags.push(artwork.author.toLowerCase().replace(/\s+/g, '-'));
      }

      const postData = {
        content: content,
        state: 'published',
        tags: tags,
        source_url: artwork.originalUrl
      };

      const response = await this.client.createPost(this.blogName, postData);

      tumblrLogger.info(`✅ Successfully posted: "${artwork.title}" (Post ID: ${response.id})`);

      return {
        success: true,
        postId: response.id,
        platform: 'tumblr'
      };

    } catch (error) {
      tumblrLogger.error(`❌ Failed to post artwork: "${artwork.title}"`, { error: error.message });
      return {
        success: false,
        error: error.message,
        platform: 'tumblr'
      };
    }
  }

  /**
   * Check if Tumblr is configured
   */
  isConfigured() {
    return !!(this.client && this.blogName);
  }

  /**
   * Get service status
   */
  getStatus() {
    if (!this.client) {
      return {
        configured: false,
        message: 'Tumblr client not configured'
      };
    }

    if (!this.blogName) {
      return {
        configured: false,
        message: 'TUMBLR_BLOG_NAME not set'
      };
    }

    return {
      configured: true,
      blogName: this.blogName
    };
  }
}

module.exports = TumblrService;