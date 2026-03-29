# SSL Certificate Setup Guide

This guide will help you set up SSL certificates for your YOURDOMAIN.COM website using Let's Encrypt.

## Prerequisites

1. Your domain `YOURDOMAIN.COM` should be pointing to your server's IP address
2. Docker and Docker Compose should be installed
3. Ports 80 and 443 should be available on your server

## Step 1: Initial Setup Without SSL

First, we need to get certificates using HTTP validation. Temporarily modify your nginx.conf to serve HTTP only for certificate generation.

Create a temporary nginx configuration:

```bash
# Create a temporary nginx config for certificate generation
cat > nginx-temp.conf << 'EOF'
server {
    listen 80;
    server_name YOURDOMAIN.COM;
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    # Let's Encrypt webroot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    # Serve the React app
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

## Step 2: Start Services with Temporary Config

```bash
# Update docker-compose.yml to use temporary nginx config
# Replace the nginx.conf volume mount temporarily:
# - ./nginx-temp.conf:/etc/nginx/conf.d/default.conf

# Start only the frontend service for certificate generation
docker-compose up -d frontend
```

## Step 3: Generate SSL Certificates

Update the certbot command in docker-compose.yml with your email:

```bash
# Edit docker-compose.yml and replace your-email@example.com with your actual email
```

Run the certbot service to obtain certificates:

```bash
# Generate SSL certificates
docker-compose --profile ssl run --rm certbot
```

Alternative manual certificate generation:

```bash
# Install certbot on the host system
sudo apt update
sudo apt install certbot

# Generate certificates using webroot method
sudo certbot certonly --webroot \
  --webroot-path=/var/www/html \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d YOURDOMAIN.COM

# The certificates will be saved to:
# /etc/letsencrypt/live/YOURDOMAIN.COM/fullchain.pem
# /etc/letsencrypt/live/YOURDOMAIN.COM/privkey.pem
```

## Step 4: Switch to SSL Configuration

After obtaining certificates:

1. Stop the frontend service:
   ```bash
   docker-compose down frontend
   ```

2. Restore the original nginx.conf:
   ```bash
   # Remove the temporary config and use the original nginx.conf
   rm nginx-temp.conf
   ```

3. Update docker-compose.yml to use the original nginx.conf:
   ```yaml
   volumes:
     - ./nginx.conf:/etc/nginx/conf.d/default.conf  # Back to original
   ```

4. Start all services:
   ```bash
   docker-compose up -d
   ```

## Step 5: Verify SSL Configuration

Test your SSL setup:

```bash
# Check if certificates are working
curl -I https://YOURDOMAIN.COM

# Test SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=YOURDOMAIN.COM
```

## Step 6: Set Up Certificate Auto-Renewal

Create a cron job for automatic certificate renewal:

```bash
# Edit crontab
sudo crontab -e

# Add this line to run certbot renewal twice daily
0 12,0 * * * certbot renew --quiet && docker-compose restart frontend
```

Alternative using Docker for renewal:

```bash
# Create a renewal script
cat > renew-ssl.sh << 'EOF'
#!/bin/bash
docker-compose --profile ssl run --rm certbot renew --quiet
if [ $? -eq 0 ]; then
    docker-compose restart frontend
fi
EOF

chmod +x renew-ssl.sh

# Add to crontab
echo "0 12,0 * * * /path/to/art-gallery-crosspost/renew-ssl.sh" | sudo crontab -
```

## Troubleshooting

### Common Issues:

1. **Domain not pointing to server**: Make sure your DNS A record points to your server's IP
   ```bash
   nslookup YOURDOMAIN.COM
   ```

2. **Port 80 blocked**: Ensure firewall allows port 80
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **Certificate path issues**: Check if certificates exist
   ```bash
   sudo ls -la /etc/letsencrypt/live/YOURDOMAIN.COM/
   ```

4. **nginx configuration errors**: Test nginx config
   ```bash
   docker-compose exec frontend nginx -t
   ```

### Alternative: Using Cloudflare SSL

If you're using Cloudflare, you can use their SSL certificates:

1. In Cloudflare dashboard, go to SSL/TLS → Origin Server
2. Create an Origin Certificate
3. Save the certificate and key files
4. Update nginx.conf to use these files instead of Let's Encrypt paths

## Backend SSL Configuration

Don't forget to set up SSL for your API backend at api.YOURDOMAIN.COM following similar steps!

---

## Quick Start Commands

```bash
# 1. Generate certificates (first time)
docker-compose --profile ssl run --rm certbot

# 2. Start all services with SSL
docker-compose up -d

# 3. Test HTTPS
curl -I https://YOURDOMAIN.COM

# 4. Check SSL rating (optional)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=YOURDOMAIN.COM
```