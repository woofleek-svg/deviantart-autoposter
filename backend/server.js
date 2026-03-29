const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cron = require('node-cron');
const db = require('./database');
const PostingOrchestrator = require('./services/PostingOrchestrator');
const { systemLogger } = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize posting orchestrator
const postingOrchestrator = new PostingOrchestrator();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Serve static files (policy pages)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Store access token and expiration
let accessToken = null;
let tokenExpires = 0;

// Initialize database connection
db.initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

// Configuration - using the same artist from your frontend config
const ARTIST_USERNAME = process.env.DEVIANTART_USERNAME || 'your-username';

/**
 * Check for new artwork and post to all platforms
 */
async function checkAndPostNewArtwork() {
  try {
    systemLogger.info(`🔍 Checking for new artwork from ${ARTIST_USERNAME}...`);

    // Get access token for DeviantArt
    const token = await getAccessToken();

    // Fetch recent artwork (limit to 10 to avoid rate limits)
    const apiUrl = `https://www.deviantart.com/api/v1/oauth2/gallery/all?username=${encodeURIComponent(ARTIST_USERNAME)}&offset=0&limit=10&mature_content=true`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`DeviantArt API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Fetch metadata (description, tags) for all deviations
    const deviationIds = data.results.map(item => item.deviationid);
    const metadata = await getDeviationMetadata(deviationIds);

    // Use orchestrator to check and post
    const result = await postingOrchestrator.checkAndPostNewArtwork(data, metadata);

    systemLogger.info(`📊 Checked ${ARTIST_USERNAME}: found ${result.newPostsCount} new artworks`);
    return result.newPostsCount;

  } catch (error) {
    systemLogger.error(`Error checking artwork for ${ARTIST_USERNAME}`, { error: error.message });
    throw error;
  }
}

/**
 * Get access token for DeviantArt API
 */
async function getAccessToken() {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing DeviantArt API credentials. Please check your .env file.');
  }

  try {
    const response = await fetch('https://www.deviantart.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set expiration 5 minutes before actual expiry for safety
    tokenExpires = Date.now() + (data.expires_in - 300) * 1000;
    
    return accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw error;
  }
}

/**
 * Fetch deviation metadata (description, tags, etc.) from DeviantArt API
 */
async function getDeviationMetadata(deviationIds) {
  if (!deviationIds || deviationIds.length === 0) {
    return [];
  }

  try {
    const token = await getAccessToken();

    // API accepts multiple deviationids as array
    const apiUrl = `https://www.deviantart.com/api/v1/oauth2/deviation/metadata?${deviationIds.map(id => `deviationids[]=${id}`).join('&')}&ext_submission=false&ext_camera=false&ext_stats=false&ext_collection=false`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.metadata || [];
  } catch (error) {
    systemLogger.error('Failed to fetch deviation metadata', { error: error.message });
    return [];
  }
}

/**
 * Fetch user's gallery from DeviantArt API
 */
app.get('/api/gallery/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 24; // Default to 24 artworks
    const offset = req.query.offset || 0;

    // Get access token
    const token = await getAccessToken();

    // Fetch user's gallery
    const apiUrl = `https://www.deviantart.com/api/v1/oauth2/gallery/all?username=${encodeURIComponent(username)}&offset=${offset}&limit=${limit}&mature_content=true`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Artist not found in the DeviantArt dimension!' 
        });
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform the data to match our frontend format
    const transformedResults = data.results.map(item => ({
      id: item.deviationid,
      src: item.content?.src || item.thumbs?.[0]?.src,
      thumbnail: item.thumbs?.[0]?.src,
      title: item.title || 'Untitled Madness',
      author: item.author?.username || username,
      authorUrl: `https://www.deviantart.com/${item.author?.username || username}`,
      width: item.content?.width || item.thumbs?.[0]?.width,
      height: item.content?.height || item.thumbs?.[0]?.height,
      originalUrl: item.url,
      description: `By ${item.author?.username || username}`,
      publishedTime: item.published_time,
      category: item.category,
      isMature: item.is_mature
    }));

    res.json({
      results: transformedResults,
      hasMore: data.has_more,
      nextOffset: data.next_offset
    });

  } catch (error) {
    console.error('Gallery fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to summon artwork from the digital realm!',
      details: error.message 
    });
  }
});

/**
 * Get user profile info
 */
app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const token = await getAccessToken();

    const response = await fetch(`https://www.deviantart.com/api/v1/oauth2/user/profile/${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      details: error.message 
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    res.json({
      status: 'The madness server is alive!',
      timestamp: new Date().toISOString(),
      hasCredentials: !!(process.env.CLIENT_ID && process.env.CLIENT_SECRET),
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'Server unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Test endpoint to verify API connection
 */
app.get('/api/test', async (req, res) => {
  try {
    const token = await getAccessToken();
    const status = postingOrchestrator.getStatus();
    res.json({
      status: 'DeviantArt API connection successful!',
      tokenExists: !!token,
      tumblrConfigured: status.tumblr.configured,
      instagramConfigured: status.instagram.configured,
      platforms: status
    });
  } catch (error) {
    res.status(500).json({
      status: 'DeviantArt API connection failed!',
      error: error.message
    });
  }
});

/**
 * Get current monitoring status (now includes both platforms)
 */
app.get('/api/posting/status', (req, res) => {
  const status = postingOrchestrator.getStatus();
  res.json({
    artist: ARTIST_USERNAME,
    platforms: status
  });
});

/**
 * Legacy endpoint for backward compatibility
 */
app.get('/api/tumblr/status', (req, res) => {
  const status = postingOrchestrator.getStatus();
  res.json({
    artist: ARTIST_USERNAME,
    tumblrConfigured: status.tumblr.configured,
    blogName: status.tumblr.blogName || 'Not configured'
  });
});

/**
 * Manually refresh Instagram token (for testing or emergency)
 */
app.post('/api/instagram/refresh-token', async (req, res) => {
  try {
    const status = postingOrchestrator.getStatus();

    if (!status.instagram.configured) {
      return res.status(400).json({
        error: 'Instagram not configured'
      });
    }

    systemLogger.info('Manual Instagram token refresh requested');

    await postingOrchestrator.instagramService.manualRefresh();
    const newStatus = postingOrchestrator.instagramService.getStatus();

    res.json({
      message: 'Instagram token refreshed successfully',
      status: newStatus
    });

  } catch (error) {
    systemLogger.error('Failed to refresh Instagram token', { error: error.message });
    res.status(500).json({
      error: 'Failed to refresh token',
      details: error.message
    });
  }
});

/**
 * Instagram OAuth - Start authorization flow
 */
app.get('/api/instagram/oauth/start', (req, res) => {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = encodeURIComponent(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/instagram/oauth/callback`);

  if (!appId) {
    return res.status(500).json({ error: 'INSTAGRAM_APP_ID not configured' });
  }

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights'
  ].join(',');

  const authUrl = `https://www.instagram.com/oauth/authorize?` +
    `client_id=${appId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=${scopes}`;

  systemLogger.info('Instagram OAuth flow started');
  res.redirect(authUrl);
});

/**
 * Instagram OAuth - Handle callback and exchange code for token
 */
app.get('/api/instagram/oauth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    systemLogger.error('Instagram OAuth error', { error, description: error_description });
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Instagram Auth Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Authorization Failed</h1>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${error_description || 'No description provided'}</p>
            <p><a href="/api/instagram/oauth/start">Try Again</a></p>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Instagram Auth Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ No Authorization Code</h1>
            <p>No authorization code received from Instagram.</p>
            <p><a href="/api/instagram/oauth/start">Try Again</a></p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    systemLogger.info('Exchanging Instagram OAuth code for access token...');

    // Exchange code for short-lived token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/instagram/oauth/callback`,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_message || 'Token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const userId = tokenData.user_id;

    systemLogger.info('Short-lived token obtained, exchanging for long-lived token...');

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await postingOrchestrator.instagramService.exchangeForLongLivedToken(shortLivedToken);

    systemLogger.info('Instagram OAuth completed successfully', { userId });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Instagram Connected!</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #efe; border: 1px solid #cfc; padding: 20px; border-radius: 5px; }
            .code-block { background: #f5f5f5; padding: 15px; border-radius: 3px; overflow-x: auto; }
            code { font-family: monospace; }
            h1 { color: #080; }
            .warning { background: #ffe; border: 1px solid #ffc; padding: 10px; margin-top: 20px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Instagram Connected Successfully!</h1>
            <p><strong>User ID:</strong> ${userId}</p>
            <p>Your Instagram account has been authorized and a long-lived access token has been generated.</p>

            <h3>📝 Update your .env file:</h3>
            <div class="code-block">
              <code>INSTAGRAM_USER_ID=${userId}</code>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong> The token has been saved to the system state.
              Make sure to update your .env file with the User ID above, then restart the backend service.
            </div>

            <p><strong>Token will auto-refresh every ~53 days!</strong></p>
            <p><a href="/api/posting/status">Check Status</a></p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    systemLogger.error('Instagram OAuth callback failed', { error: error.message });
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Token Exchange Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Token Exchange Failed</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please check your App ID and App Secret in .env file.</p>
            <p><a href="/api/instagram/oauth/start">Try Again</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

/**
 * Retry posting specific artwork to Instagram only
 */
app.post('/api/instagram/retry/:artworkId', async (req, res) => {
  try {
    const { artworkId } = req.params;

    // Get artwork from database
    const artwork = await db.queryOne('SELECT * FROM posted_artwork WHERE id = ?', [artworkId]);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    systemLogger.info(`Retrying Instagram post for: "${artwork.title}"`);

    // Get fresh DeviantArt data
    const token = await getAccessToken();
    const daResponse = await fetch(
      `https://www.deviantart.com/api/v1/oauth2/deviation/${artwork.deviantart_id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!daResponse.ok) {
      throw new Error('Failed to fetch artwork from DeviantArt');
    }

    const daArtwork = await daResponse.json();

    // Fetch metadata for description and tags
    const metadata = await getDeviationMetadata([artwork.deviantart_id]);
    const meta = metadata[0] || {};

    // Extract description and tags
    const description = postingOrchestrator.stripHtml(meta.description || '');
    const tags = (meta.tags || []).map(tag => tag.tag_name);

    // Prepare artwork object
    const artworkToPost = {
      id: artwork.deviantart_id,
      src: daArtwork.content?.src,
      preview: daArtwork.preview?.src,
      thumbnail: daArtwork.thumbs?.[0]?.src,
      title: artwork.title,
      author: artwork.artist_username,
      originalUrl: artwork.deviantart_url,
      description: description,
      tags: tags
    };

    // Post to Instagram
    const result = await postingOrchestrator.instagramService.postArtwork(artworkToPost);

    if (result.success) {
      // Update database
      const newStatus = artwork.tumblr_post_id ? 'both' : 'instagram_only';
      await db.query(
        'UPDATE posted_artwork SET instagram_post_id = ?, instagram_posted_at = NOW(), post_status = ? WHERE id = ?',
        [result.postId, newStatus, artworkId]
      );

      systemLogger.info(`Successfully posted to Instagram: "${artwork.title}"`);
      res.json({
        message: 'Successfully posted to Instagram',
        instagramPostId: result.postId,
        newStatus
      });
    } else {
      res.status(500).json({ error: 'Failed to post to Instagram', details: result.error });
    }
  } catch (error) {
    systemLogger.error('Instagram retry failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get posted artwork history
 */
app.get('/api/posted/artwork', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // MySQL requires LIMIT/OFFSET as literals, not placeholders
    const rows = await db.query(
      `SELECT * FROM posted_artwork ORDER BY posted_at DESC LIMIT ${limit} OFFSET ${offset}`,
      []
    );

    res.json({
      artwork: rows,
      limit,
      offset
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch posted artwork' });
  }
});

/**
 * Manually trigger artwork check for the configured artist (both platforms)
 */
app.post('/api/posting/check', async (req, res) => {
  try {
    const status = postingOrchestrator.getStatus();
    if (!status.tumblr.configured && !status.instagram.configured) {
      return res.status(400).json({
        error: 'No platforms configured. Please configure Tumblr and/or Instagram credentials.'
      });
    }

    const newPostsCount = await checkAndPostNewArtwork();
    res.json({
      message: `Check completed for ${ARTIST_USERNAME}`,
      newPostsFound: newPostsCount,
      platforms: status
    });

  } catch (error) {
    systemLogger.error('Error in manual check', { error: error.message });
    res.status(500).json({
      error: 'Failed to check artwork',
      details: error.message
    });
  }
});

/**
 * Legacy endpoint for backward compatibility
 */
app.post('/api/tumblr/check', async (req, res) => {
  try {
    const newPostsCount = await checkAndPostNewArtwork();
    res.json({
      message: `Check completed for ${ARTIST_USERNAME}`,
      newPostsFound: newPostsCount
    });

  } catch (error) {
    systemLogger.error('Error in manual check', { error: error.message });
    res.status(500).json({
      error: 'Failed to check artwork',
      details: error.message
    });
  }
});

/**
 * Scheduled job to check for new artwork
 */
async function runScheduledCheck() {
  try {
    const status = postingOrchestrator.getStatus();
    if (!status.tumblr.configured && !status.instagram.configured) {
      systemLogger.info('⏭️ Skipping scheduled check - No platforms configured');
      return;
    }

    systemLogger.info('🕐 Running scheduled artwork check...');
    const newPosts = await checkAndPostNewArtwork();
    systemLogger.info(`🎉 Scheduled check completed. New posts: ${newPosts}`);

  } catch (error) {
    systemLogger.error('Error in scheduled check', { error: error.message });
  }
}

// Schedule the job to run every 30 minutes
// Format: minute hour day month day-of-week
cron.schedule('*/30 * * * *', runScheduledCheck, {
  timezone: "UTC"
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🔄 Received ${signal}, shutting down gracefully...`);
  await db.closePool();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, async () => {
  console.log(`🎨 Art crosspost backend server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
  console.log(`⏰ Artwork monitoring scheduled to run every 30 minutes`);

  // Initialize posting orchestrator
  try {
    await postingOrchestrator.initialize();
  } catch (error) {
    systemLogger.error('Failed to initialize posting orchestrator', { error: error.message });
  }

  if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    console.warn('⚠️  WARNING: DeviantArt API credentials not found!');
    console.warn('   Please copy .env.example to .env and add your credentials.');
  }

  const status = postingOrchestrator.getStatus();

  if (!status.tumblr.configured) {
    console.warn('⚠️  WARNING: Tumblr API credentials not found!');
    console.warn('   Please add TUMBLR_CONSUMER_KEY, TUMBLR_CONSUMER_SECRET, TUMBLR_TOKEN, TUMBLR_TOKEN_SECRET, and TUMBLR_BLOG_NAME to .env');
  }

  if (!status.instagram.configured) {
    console.warn('⚠️  WARNING: Instagram API credentials not found!');
    console.warn('   Please add INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN to .env');
  }

  if (!process.env.DB_PASSWORD) {
    console.warn('⚠️  WARNING: MySQL database password not found!');
    console.warn('   Please add DB_PASSWORD to your .env file.');
  }
});