# Art Gallery Cross-Post System Documentation

## Overview

An automated art sharing system that monitors DeviantArt for new artwork and automatically cross-posts to Instagram and Tumblr. The system uses a scheduled cron job to check for new artwork every 30 minutes.

## Architecture

### Technology Stack
- **Frontend**: React (served via Nginx)
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0
- **Deployment**: Docker + Docker Compose
- **Logging**: Winston (with platform-specific prefixes)

### Service Structure
```
backend/
├── server.js                    # Main Express server
├── database.js                  # MySQL connection & schema
├── services/
│   ├── InstagramService.js      # Instagram Graph API integration
│   ├── TumblrService.js         # Tumblr API integration
│   └── PostingOrchestrator.js   # Coordinates both platforms
├── utils/
│   └── logger.js                # Platform-specific logging
└── public/                      # Static policy pages
```

## How It Works

### 1. Scheduled Monitoring (Every 30 minutes)
- Cron job runs: `*/30 * * * *`
- Fetches latest 10 artworks from the configured DeviantArt user
- Checks database to see if artwork has been posted before
- If new artwork found, triggers posting orchestrator

### 2. Posting Orchestrator
- Receives new artwork data
- Posts to Tumblr (if configured)
- Posts to Instagram (if configured)
- Tracks success/failure per platform
- Saves results to database with status:
  - `tumblr_only` - Posted only to Tumblr
  - `instagram_only` - Posted only to Instagram
  - `both` - Successfully posted to both platforms
  - `failed` - Failed on all platforms

### 3. Database Tracking
Each posted artwork is tracked in the `posted_artwork` table:
```sql
CREATE TABLE posted_artwork (
  id VARCHAR(255) PRIMARY KEY,
  deviantart_id VARCHAR(255) UNIQUE NOT NULL,
  deviantart_url TEXT,
  tumblr_post_id VARCHAR(255),
  instagram_post_id VARCHAR(255),
  instagram_posted_at TIMESTAMP NULL,
  artist_username VARCHAR(255),
  title TEXT,
  post_status ENUM('tumblr_only', 'instagram_only', 'both', 'failed'),
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Instagram Token Auto-Renewal
- Tokens are long-lived (~60 days)
- System checks expiration daily
- When < 7 days remaining, automatically refreshes
- Fallback: If refresh fails, exchanges for new token using App credentials
- State stored in: `backend/state/instagram_state.json`

## API Endpoints

### Public/Frontend Endpoints

#### `GET /api/gallery/:username`
Fetches artwork from DeviantArt for a specific user.

#### `GET /api/user/:username`
Gets DeviantArt user profile information.

#### `GET /api/health`
Health check endpoint for monitoring.

### Posting Management Endpoints

#### `GET /api/posting/status`
Gets status of all configured posting platforms.

#### `POST /api/posting/check`
Manually triggers artwork check and posting for all platforms.

#### `GET /api/posted/artwork`
Gets history of posted artwork.

### Instagram OAuth Endpoints

#### `GET /api/instagram/oauth/start`
Initiates Instagram OAuth authorization flow.

#### `GET /api/instagram/oauth/callback`
Handles OAuth callback from Instagram.

#### `POST /api/instagram/refresh-token`
Manually triggers Instagram token refresh.

#### `POST /api/instagram/retry/:artworkId`
Retry posting a specific artwork to Instagram only.

### Policy Pages (Required for Facebook App)

#### `GET /privacy-policy.html`
#### `GET /terms-of-service.html`
#### `GET /data-deletion.html`

## Environment Variables

See `backend/.env.example` for all required backend configuration.
See `.env.example` for frontend and infrastructure configuration.

## Logging System

### Platform Prefixes
- `[SYSTEM]` - Server/system events
- `[ORCHESTRATOR]` - Cross-platform coordination
- `[TUMBLR]` - Tumblr-specific operations
- `[INSTAGRAM]` - Instagram-specific operations

### Log Files
Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Error-level logs only

## Image Quality & Fallback System

### Smart Image Selection
The system implements a 3-tier fallback strategy for Instagram's 8MB limit:

1. **Full-Size Image** (Primary) - Original DeviantArt content image
2. **Preview Image** (Fallback #1) - DeviantArt preview (~894x894 JPEG)
3. **Thumbnail** (Fallback #2) - Small thumbnails, last resort

## Deployment

### Production Deployment

```bash
# Copy .env.example files and configure
cp backend/.env.example backend/.env
cp .env.example .env
cp nginx.conf.example nginx.conf

# Edit all .env files with your credentials

# Build and start
docker compose up --build -d

# Verify services
docker compose ps

# Check logs
docker compose logs -f backend
```

### Important Files to Persist
1. **Database Volume**: `mysql-data` (Docker volume)
2. **Instagram State**: `backend/state/instagram_state.json`
3. **Logs**: `backend/logs/` (optional)

## Troubleshooting

### Instagram Not Posting
1. Check status: `GET /api/posting/status`
2. Verify token hasn't expired
3. Re-authorize via OAuth: `GET /api/instagram/oauth/start`
4. After OAuth, rebuild container: `docker compose up --build -d backend`

### Common Issues
- **"Cannot parse access token" (Error 190)**: Token expired, re-authorize via OAuth
- **"Image too large"**: System should auto-fallback to preview; check logs
- **Wrong API endpoints**: Must use `graph.instagram.com` (NOT `graph.facebook.com`)

## Security Considerations
- Never commit `.env` files to git
- Use strong, randomly generated passwords for database
- Rotate API secrets periodically
- All API endpoints should be served over HTTPS in production

## Support & Resources
- DeviantArt API Docs: https://www.deviantart.com/developers/
- Instagram API with Instagram Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- Tumblr API: https://www.tumblr.com/docs/en/api/v2
