# Art Gallery Cross-Post

A full-stack system that displays your DeviantArt gallery on a custom website and automatically cross-posts new artwork to Instagram and Tumblr.

## Features

- **React Gallery Frontend** — Responsive art gallery with slideshow, infinite scroll, and contact form
- **DeviantArt Integration** — Proxies the DeviantArt API to fetch your gallery server-side
- **Auto Cross-Posting** — Monitors DeviantArt every 30 minutes and posts new art to Instagram & Tumblr
- **Instagram Graph API** — Full OAuth flow, automatic token refresh, smart image fallback (full → preview → thumbnail) for Instagram's 8MB limit
- **Tumblr API** — OAuth1 posting with tags and attribution
- **MySQL Tracking** — Tracks what's been posted where, with retry support
- **Docker Compose** — One-command deployment with MySQL, backend, frontend (Nginx), and Certbot SSL

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  DeviantArt  │
│  React/Nginx │     │  Express.js  │     │     API      │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────┴───────┐
                    │    MySQL     │
                    │  (tracking)  │
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
        ┌──────────┐            ┌─────────────┐
        │  Tumblr  │            │  Instagram   │
        │   API    │            │  Graph API   │
        └──────────┘            └─────────────┘
```

## Prerequisites

- **Node.js** 18+
- **Docker** & **Docker Compose**
- **DeviantArt** application ([create one](https://www.deviantart.com/developers/apps))
- **Tumblr** application ([create one](https://www.tumblr.com/oauth/apps)) — optional
- **Instagram Business/Creator account** + Facebook App ([setup guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)) — optional

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/art-gallery-crosspost.git
cd art-gallery-crosspost

# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp nginx.conf.example nginx.conf

# Edit all three files with your credentials
```

### 2. Run with Docker Compose

```bash
docker compose up --build -d
```

The frontend will be available at `http://localhost` and the backend API at `http://localhost:3001`.

### 3. Development Mode

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Run frontend dev server
npm run dev

# Run backend (in another terminal)
cd backend && npm run dev
```

## Configuration Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_ID` | Yes | DeviantArt app client ID |
| `CLIENT_SECRET` | Yes | DeviantArt app client secret |
| `DEVIANTART_USERNAME` | Yes | DeviantArt username to monitor |
| `BACKEND_URL` | Yes | Public URL of your backend (for OAuth callbacks) |
| `FRONTEND_URL` | Yes | Public URL of your frontend (for CORS) |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_ROOT_PASSWORD` | Yes | MySQL root password |
| `TUMBLR_*` | No | Tumblr OAuth1 credentials |
| `INSTAGRAM_*` | No | Instagram/Facebook app credentials |

### Frontend (`.env` or build args)

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | Backend API URL |
| `VITE_ARTIST_USERNAME` | DeviantArt username for gallery |
| `VITE_ARTIST_DISPLAY_NAME` | Display name on the site |
| `VITE_GA_TRACKING_ID` | Google Analytics ID (optional) |
| `VITE_EMAILJS_*` | EmailJS credentials for contact form (optional) |

## Instagram Setup

1. Create a Facebook App with **Instagram API with Instagram Login**
2. Configure redirect URI: `https://api.your-domain.com/api/instagram/oauth/callback`
3. Set app to Live mode with privacy policy & terms pages (served by the backend at `/privacy-policy.html`, `/terms-of-service.html`, `/data-deletion.html`)
4. Visit `https://api.your-domain.com/api/instagram/oauth/start` to authorize
5. Copy the User ID and add it to `backend/.env` as `INSTAGRAM_USER_ID`
6. Rebuild: `docker compose up --build -d backend`

Tokens auto-refresh when they near expiration (~60 day lifecycle).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gallery/:username` | Fetch DeviantArt gallery |
| GET | `/api/user/:username` | Get DeviantArt user profile |
| GET | `/api/health` | Health check |
| GET | `/api/posting/status` | Cross-posting platform status |
| POST | `/api/posting/check` | Manually trigger artwork check |
| GET | `/api/posted/artwork` | Posted artwork history |
| POST | `/api/instagram/retry/:id` | Retry failed Instagram post |
| GET | `/api/instagram/oauth/start` | Start Instagram OAuth flow |

## Customization

### Design
The frontend uses a comic book aesthetic with Tailwind CSS. Modify `tailwind.config.js` to adjust colors and `index.html` to change fonts.

### Adding Platforms
The posting system is modular — see `backend/services/` for `TumblrService.js` and `InstagramService.js` as examples. Add a new service and register it in `PostingOrchestrator.js`.

## Deployment

For production with SSL:

1. Point your domain DNS to your server
2. Configure `nginx.conf` from the example with your domains
3. Run `docker compose --profile ssl up certbot` to get SSL certificates
4. `docker compose up --build -d`

See `scripts/deploy-swarm.sh` for Docker Swarm deployment.

## License

MIT
