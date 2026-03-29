#!/bin/bash

# Docker Swarm Deployment Script for Art Gallery Cross-Post System
# This script builds images and deploys the stack to Docker Swarm

set -e

STACK_NAME="${STACK_NAME:-art-crosspost}"

echo "🚀 Starting Docker Swarm deployment for Art Gallery..."

# Check if Docker Swarm is initialized
if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm is not initialized. Please run 'docker swarm init' first."
    exit 1
fi

# Build Docker images
echo "🔨 Building Docker images..."

# Build backend image
echo "📦 Building backend image..."
docker build -t art-crosspost-backend:latest ./backend

# Build frontend image
echo "📦 Building frontend image..."
docker build -t art-crosspost-frontend:latest .

echo "✅ Docker images built successfully"

# Create Docker secrets (if they don't exist)
echo "🔐 Setting up Docker secrets..."

# Read environment variables from backend/.env
if [ -f "./backend/.env" ]; then
    source ./backend/.env

    # Create secrets if they don't exist
    echo "$CLIENT_ID" | docker secret create deviantart_client_id - 2>/dev/null || echo "Secret deviantart_client_id already exists"
    echo "$CLIENT_SECRET" | docker secret create deviantart_client_secret - 2>/dev/null || echo "Secret deviantart_client_secret already exists"

    # Tumblr secrets (optional)
    if [ ! -z "$TUMBLR_CONSUMER_KEY" ]; then
        echo "$TUMBLR_CONSUMER_KEY" | docker secret create tumblr_consumer_key - 2>/dev/null || echo "Secret tumblr_consumer_key already exists"
        echo "$TUMBLR_CONSUMER_SECRET" | docker secret create tumblr_consumer_secret - 2>/dev/null || echo "Secret tumblr_consumer_secret already exists"
        echo "$TUMBLR_TOKEN" | docker secret create tumblr_token - 2>/dev/null || echo "Secret tumblr_token already exists"
        echo "$TUMBLR_TOKEN_SECRET" | docker secret create tumblr_token_secret - 2>/dev/null || echo "Secret tumblr_token_secret already exists"
    else
        echo "⚠️  Tumblr credentials not found in .env - creating empty secrets"
        echo "" | docker secret create tumblr_consumer_key - 2>/dev/null || true
        echo "" | docker secret create tumblr_consumer_secret - 2>/dev/null || true
        echo "" | docker secret create tumblr_token - 2>/dev/null || true
        echo "" | docker secret create tumblr_token_secret - 2>/dev/null || true
    fi
else
    echo "❌ Backend .env file not found. Please ensure backend/.env exists with API credentials."
    exit 1
fi

echo "✅ Docker secrets configured"

# Deploy the stack
echo "🚀 Deploying stack to Docker Swarm..."
docker stack deploy -c docker-stack.yml "$STACK_NAME"

echo "⏱️  Waiting for services to start..."
sleep 10

# Check deployment status
echo "📊 Checking service status..."
docker service ls

echo ""
echo "🎯 Checking individual service health..."
docker service ps "${STACK_NAME}_mysql-db"
docker service ps "${STACK_NAME}_backend"
docker service ps "${STACK_NAME}_frontend"

echo ""
echo "✅ Docker Swarm deployment completed!"
echo ""
echo "📍 Your services should be available at:"
echo "   🌐 Frontend: https://your-domain.com"
echo "   🔗 Backend API: https://api.your-domain.com"
echo "   🗄️  MySQL: Internal network only"
echo ""
echo "📊 Monitor services with:"
echo "   docker service ls"
echo "   docker service logs ${STACK_NAME}_backend"
echo "   docker service logs ${STACK_NAME}_frontend"
echo ""
echo "🔄 To update the stack:"
echo "   ./scripts/deploy-swarm.sh"
echo ""
echo "⚠️  To remove the stack:"
echo "   docker stack rm $STACK_NAME"
