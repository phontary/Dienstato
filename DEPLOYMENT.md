# Dienstato Deployment Guide

This guide explains how to deploy Dienstato using Docker Compose for production use.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/phontary/Dienstato.git
cd Dienstato
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database (SQLite - handled by Docker volume)
DATABASE_URL=file:./data/sqlite.db

# SMTP Configuration for Email Service
SMTP_HOST=smtp.strato.de
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dienste@sabry.io
SMTP_PASSWORD=your_actual_smtp_password
SMTP_FROM_EMAIL=dienste@sabry.io
SMTP_FROM_NAME=Dienstato

# Cron Job Secret (for scheduled email processing)
CRON_SECRET=generate_a_secure_random_string_here

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Supabase (if you want to use Supabase instead of SQLite)
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Important**:
- Replace `your_actual_smtp_password` with your real SMTP password
- Generate a secure random string for `CRON_SECRET` (e.g., `openssl rand -hex 32`)
- Set `NEXT_PUBLIC_APP_URL` to your actual domain

### 3. Create Required Directories

```bash
mkdir -p data temp
```

### 4. Start the Application

```bash
docker-compose up -d
```

This will:
- Build the Docker image from the Dockerfile
- Start the Dienstato container
- Automatically run database migrations
- Start the application on port 3000

### 5. Verify Deployment

Check that the application is running:

```bash
# View logs
docker-compose logs -f dienstato

# Check health status
curl http://localhost:3000/api/health
```

You should see a healthy response and be able to access the application at `http://localhost:3000`

## Email System Setup

The email system requires periodic processing of the email queue and monthly reports. You have two options:

### Option A: Use Docker Compose Services (Recommended)

Uncomment the email processor services in `docker-compose.yml`:

```yaml
# Uncomment these sections in docker-compose.yml
dienstato-email-processor:
  image: curlimages/curl:latest
  container_name: dienstato-email-processor
  restart: unless-stopped
  depends_on:
    - dienstato
  command: >
    sh -c "while true; do
      sleep 300;
      curl -X POST http://dienstato:3000/api/emails/process-queue
        -H 'Authorization: Bearer ${CRON_SECRET}';
    done"

dienstato-report-processor:
  image: curlimages/curl:latest
  container_name: dienstato-report-processor
  restart: unless-stopped
  depends_on:
    - dienstato
  command: >
    sh -c "while true; do
      sleep 86400;
      curl -X POST http://dienstato:3000/api/emails/process-monthly-reports
        -H 'Authorization: Bearer ${CRON_SECRET}';
    done"
```

Then restart:

```bash
docker-compose up -d
```

### Option B: Use Host System Cron Jobs

Add these to your host's crontab (`crontab -e`):

```bash
# Process email queue every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/emails/process-queue -H "Authorization: Bearer YOUR_CRON_SECRET"

# Process monthly reports daily at 1 AM
0 1 * * * curl -X POST http://localhost:3000/api/emails/process-monthly-reports -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with the value from your `.env` file.

## Production Considerations

### Reverse Proxy (Nginx/Traefik)

For production, run Dienstato behind a reverse proxy with HTTPS:

**Nginx Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Backups

Regularly backup the SQLite database:

```bash
# Create backup
docker exec dienstato sqlite3 /app/data/sqlite.db ".backup '/app/data/sqlite-backup-$(date +%Y%m%d).db'"

# Or backup the entire data directory
tar -czf dienstato-backup-$(date +%Y%m%d).tar.gz ./data
```

**Automated Backup Script:**

```bash
#!/bin/bash
# backup.sh - Add to crontab: 0 2 * * * /path/to/backup.sh

BACKUP_DIR="/backup/dienstato"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec dienstato sqlite3 /app/data/sqlite.db ".backup '/app/data/sqlite-backup-$DATE.db'"
docker cp dienstato:/app/data/sqlite-backup-$DATE.db $BACKUP_DIR/

# Keep only last 7 days
find $BACKUP_DIR -name "sqlite-backup-*.db" -mtime +7 -delete
```

### Monitoring

Monitor the application:

```bash
# View logs
docker-compose logs -f dienstato

# Check container status
docker-compose ps

# Monitor resource usage
docker stats dienstato

# Check email queue status (connect to container and query DB)
docker exec -it dienstato sqlite3 /app/data/sqlite.db "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"
```

### Updates

To update to the latest version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify
docker-compose logs -f dienstato
```

## Using Pre-built Images

Instead of building locally, you can use pre-built images from GitHub Container Registry (once set up):

```yaml
# In docker-compose.yml, comment out build and use image:
services:
  dienstato:
    image: ghcr.io/phontary/dienstato:latest
    # build:
    #   context: .
    #   dockerfile: Dockerfile
```

Then:

```bash
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs dienstato

# Verify environment variables
docker-compose config

# Check file permissions
ls -la data/
```

### Email Not Sending

```bash
# Check SMTP settings in .env
docker-compose exec dienstato cat /app/.env | grep SMTP

# View email queue status
docker exec dienstato sqlite3 /app/data/sqlite.db "SELECT * FROM email_queue WHERE status='failed';"

# Check email processor logs (if using Option A)
docker-compose logs dienstato-email-processor
```

### Database Issues

```bash
# Run migrations manually
docker-compose exec dienstato npm run db:migrate

# Check database integrity
docker exec dienstato sqlite3 /app/data/sqlite.db "PRAGMA integrity_check;"

# Reset database (CAUTION: destroys all data)
docker-compose down
rm -rf data/sqlite.db*
docker-compose up -d
```

### Performance Issues

```bash
# Increase memory limits in docker-compose.yml
services:
  dienstato:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Security Best Practices

1. **NEVER commit `.env` file** - It contains sensitive credentials
2. **Use strong CRON_SECRET** - Generate with `openssl rand -hex 32`
3. **Enable HTTPS** - Always use SSL/TLS in production
4. **Regular updates** - Keep the application and dependencies updated
5. **Backup regularly** - Automate database backups
6. **Limit exposure** - Use firewall rules to restrict access
7. **Monitor logs** - Watch for suspicious activity

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./data/sqlite.db` | Database connection string |
| `SMTP_HOST` | Yes | `smtp.strato.de` | SMTP server hostname |
| `SMTP_PORT` | Yes | `465` | SMTP server port |
| `SMTP_SECURE` | Yes | `true` | Use SSL/TLS for SMTP |
| `SMTP_USER` | Yes | - | SMTP username/email |
| `SMTP_PASSWORD` | Yes | - | SMTP password |
| `SMTP_FROM_EMAIL` | Yes | - | Sender email address |
| `SMTP_FROM_NAME` | Yes | `Dienstato` | Sender display name |
| `CRON_SECRET` | Yes | - | Secret for cron endpoints |
| `NEXT_PUBLIC_APP_URL` | Yes | - | Public application URL |
| `NODE_ENV` | No | `production` | Node environment |

## Support

For issues and questions:
- GitHub Issues: https://github.com/phontary/Dienstato/issues
- Email System Documentation: See `EMAIL_SYSTEM_README.md`

## License

See LICENSE file in the repository.
