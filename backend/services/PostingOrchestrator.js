const TumblrService = require('./TumblrService');
const InstagramService = require('./InstagramService');
const { orchestratorLogger } = require('../utils/logger');
const db = require('../database');

class PostingOrchestrator {
  constructor() {
    this.tumblrService = new TumblrService();
    this.instagramService = new InstagramService();
  }

  /**
   * Initialize both services
   */
  async initialize() {
    orchestratorLogger.info('Initializing posting orchestrator...');

    const tumblrReady = await this.tumblrService.initialize();
    const instagramReady = await this.instagramService.initialize();

    const platforms = [];
    if (tumblrReady) platforms.push('Tumblr');
    if (instagramReady) platforms.push('Instagram');

    if (platforms.length === 0) {
      orchestratorLogger.warn('⚠️  No platforms configured! Posts will not be shared.');
    } else {
      orchestratorLogger.info(`✅ Configured platforms: ${platforms.join(', ')}`);
    }

    return { tumblrReady, instagramReady };
  }

  /**
   * Check if artwork has already been posted
   */
  async isArtworkPosted(deviantartId) {
    try {
      const row = await db.queryOne(
        'SELECT * FROM posted_artwork WHERE deviantart_id = ?',
        [deviantartId]
      );
      return !!row;
    } catch (error) {
      orchestratorLogger.error('Error checking if artwork is posted', { error: error.message });
      throw error;
    }
  }

  /**
   * Save posted artwork to database
   */
  async savePostedArtwork(artwork, results) {
    try {
      const tumblrPostId = results.tumblr?.success ? results.tumblr.postId : null;
      const instagramPostId = results.instagram?.success ? results.instagram.postId : null;

      // Determine post status
      let postStatus = 'failed';
      if (tumblrPostId && instagramPostId) {
        postStatus = 'both';
      } else if (tumblrPostId) {
        postStatus = 'tumblr_only';
      } else if (instagramPostId) {
        postStatus = 'instagram_only';
      }

      const result = await db.query(
        `INSERT INTO posted_artwork (
          id,
          deviantart_id,
          deviantart_url,
          tumblr_post_id,
          instagram_post_id,
          instagram_posted_at,
          artist_username,
          title,
          post_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          artwork.id,
          artwork.id,
          artwork.originalUrl,
          tumblrPostId,
          instagramPostId,
          instagramPostId ? new Date() : null,
          artwork.author,
          artwork.title,
          postStatus
        ]
      );

      orchestratorLogger.info(`📝 Saved to database (Status: ${postStatus})`, {
        artworkId: artwork.id,
        insertId: result.insertId
      });

      return result.insertId;
    } catch (error) {
      orchestratorLogger.error('Error saving posted artwork', { error: error.message });
      throw error;
    }
  }

  /**
   * Post artwork to all configured platforms
   */
  async postArtwork(artwork) {
    orchestratorLogger.info(`🎨 Processing artwork: "${artwork.title}" by ${artwork.author}`);

    const results = {
      tumblr: null,
      instagram: null
    };

    let successCount = 0;
    let totalConfigured = 0;

    // Post to Tumblr
    if (this.tumblrService.isConfigured()) {
      totalConfigured++;
      try {
        results.tumblr = await this.tumblrService.postArtwork(artwork);
        if (results.tumblr.success) successCount++;
      } catch (error) {
        results.tumblr = { success: false, error: error.message, platform: 'tumblr' };
      }
    } else {
      orchestratorLogger.debug('Skipping Tumblr (not configured)');
    }

    // Post to Instagram
    if (this.instagramService.isConfigured()) {
      totalConfigured++;
      try {
        results.instagram = await this.instagramService.postArtwork(artwork);
        if (results.instagram.success) successCount++;
      } catch (error) {
        results.instagram = { success: false, error: error.message, platform: 'instagram' };
      }
    } else {
      orchestratorLogger.debug('Skipping Instagram (not configured)');
    }

    // Log summary
    if (totalConfigured === 0) {
      orchestratorLogger.warn('⚠️  No platforms configured - artwork not posted');
    } else if (successCount === totalConfigured) {
      orchestratorLogger.info(`🎉 Artwork posted to ${successCount}/${totalConfigured} platforms`);
    } else if (successCount > 0) {
      orchestratorLogger.warn(`⚠️  Partial success: ${successCount}/${totalConfigured} platforms`);
    } else {
      orchestratorLogger.error(`❌ Failed to post to all ${totalConfigured} platforms`);
    }

    return {
      results,
      successCount,
      totalConfigured
    };
  }

  /**
   * Strip HTML tags from description
   */
  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Check for new artwork and post if needed
   */
  async checkAndPostNewArtwork(galleryData, metadata = []) {
    if (!galleryData.results || galleryData.results.length === 0) {
      orchestratorLogger.debug('No artwork found in gallery data');
      return { newPostsCount: 0, results: [] };
    }

    // Create a map of metadata by deviationid for quick lookup
    const metadataMap = {};
    metadata.forEach(meta => {
      metadataMap[meta.deviationid] = meta;
    });

    let newPostsCount = 0;
    const postResults = [];

    // Process each artwork (limit to recent 10 to avoid spamming)
    const artworksToCheck = galleryData.results.slice(0, 10);

    for (const item of artworksToCheck) {
      const artworkId = item.id || item.deviationid;

      // Check if already posted
      const alreadyPosted = await this.isArtworkPosted(artworkId);
      if (alreadyPosted) {
        continue;
      }

      // Get metadata for this artwork
      const meta = metadataMap[artworkId] || {};

      // Extract description and tags
      const description = this.stripHtml(meta.description || '');
      const tags = (meta.tags || []).map(tag => tag.tag_name);

      // Transform artwork data
      const artwork = {
        id: artworkId,
        src: item.src || item.content?.src || item.thumbs?.[0]?.src,
        preview: item.preview?.src,
        thumbnail: item.thumbnail || item.thumbs?.[0]?.src,
        title: item.title || 'Untitled Artwork',
        author: item.author?.username || item.author || 'Unknown Artist',
        originalUrl: item.originalUrl || item.url,
        description: description,
        tags: tags
      };

      try {
        // Post to all platforms
        const postResult = await this.postArtwork(artwork);

        // Save to database if at least one platform succeeded
        if (postResult.successCount > 0) {
          await this.savePostedArtwork(artwork, postResult.results);
          newPostsCount++;
        }

        postResults.push({
          artwork: artwork.title,
          ...postResult
        });

        // Add delay between posts to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        orchestratorLogger.error(`Failed to process artwork "${artwork.title}"`, { error: error.message });
        postResults.push({
          artwork: artwork.title,
          error: error.message
        });
      }
    }

    orchestratorLogger.info(`📊 Check complete: ${newPostsCount} new artworks posted`);

    return {
      newPostsCount,
      results: postResults
    };
  }

  /**
   * Get status of all platforms
   */
  getStatus() {
    return {
      tumblr: this.tumblrService.getStatus(),
      instagram: this.instagramService.getStatus()
    };
  }
}

module.exports = PostingOrchestrator;