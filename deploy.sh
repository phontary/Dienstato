#!/bin/bash
set -e

echo "================================================"
echo "Dienstato Deployment Script"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}IMPORTANT: Please edit .env and configure your settings:${NC}"
    echo "  - SMTP_PASSWORD (your actual SMTP password)"
    echo "  - CRON_SECRET (generate with: openssl rand -hex 32)"
    echo "  - NEXT_PUBLIC_APP_URL (your domain)"
    echo ""
    read -p "Press Enter after you've edited .env to continue..."
fi

# Create required directories
echo "Creating required directories..."
mkdir -p data temp
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Check if SMTP_PASSWORD is set
if grep -q "your_password_here" .env; then
    echo -e "${RED}Error: SMTP_PASSWORD is not configured in .env${NC}"
    echo "Please edit .env and set your actual SMTP password"
    exit 1
fi

# Check if CRON_SECRET is set
if grep -q "your-secure-secret-key-here" .env; then
    echo -e "${YELLOW}Warning: CRON_SECRET is not configured${NC}"
    echo "Generating a secure CRON_SECRET..."
    CRON_SECRET=$(openssl rand -hex 32)
    sed -i.bak "s/your-secure-secret-key-here/$CRON_SECRET/g" .env
    rm .env.bak 2>/dev/null || true
    echo -e "${GREEN}✓ CRON_SECRET generated${NC}"
    echo ""
fi

# Ask about email processors
echo ""
echo "Do you want to enable automatic email processing?"
echo "This will process the email queue every 5 minutes and monthly reports daily."
echo ""
read -p "Enable email processors? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enabling email processors in docker-compose.yml..."
    # This would require uncommenting the sections in docker-compose.yml
    echo -e "${YELLOW}Note: You'll need to manually uncomment the email processor sections in docker-compose.yml${NC}"
    echo "Or set up host cron jobs as described in DEPLOYMENT.md"
fi
echo ""

# Build and start
echo "Building and starting Dienstato..."
echo ""
docker-compose up -d --build

# Wait a bit for the container to start
echo ""
echo "Waiting for application to start..."
sleep 10

# Check health
echo ""
echo "Checking application health..."
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${YELLOW}Warning: Health check failed. The application might still be starting...${NC}"
    echo "Check logs with: docker-compose logs -f dienstato"
fi

# Show logs
echo ""
echo "Showing application logs (Ctrl+C to exit)..."
echo ""
docker-compose logs -f dienstato &
LOGS_PID=$!

# Wait a bit then kill logs
sleep 5
kill $LOGS_PID 2>/dev/null || true

echo ""
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Dienstato is now running at: http://localhost:3000"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Register a new account"
echo "  3. Configure email preferences in your profile"
echo "  4. Create your first calendar"
echo ""
echo "Useful commands:"
echo "  - View logs:        docker-compose logs -f dienstato"
echo "  - Stop:             docker-compose stop"
echo "  - Start:            docker-compose start"
echo "  - Restart:          docker-compose restart"
echo "  - Stop & remove:    docker-compose down"
echo ""
echo "Documentation:"
echo "  - Quick Start:      DOCKER_DEPLOYMENT_QUICK_START.md"
echo "  - Full Guide:       DEPLOYMENT.md"
echo "  - Email System:     EMAIL_SYSTEM_README.md"
echo ""
