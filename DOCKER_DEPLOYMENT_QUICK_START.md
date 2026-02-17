# Dienstato - Docker Deployment Quick Start

## Deploy in 5 Minutes

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/phontary/Dienstato.git
cd Dienstato

# Copy environment file
cp .env.example .env

# Create required directories
mkdir -p data temp
```

### 2. Configure Environment

Edit `.env` and set these required values:

```env
# SMTP Configuration (REQUIRED for email features)
SMTP_HOST=smtp.strato.de
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dienste@sabry.io
SMTP_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE
SMTP_FROM_EMAIL=dienste@sabry.io
SMTP_FROM_NAME=Dienstato

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=YOUR_SECURE_SECRET_HERE

# Your Domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f dienstato

# Check status
curl http://localhost:3000/api/health
```

### 4. Enable Email Processing (Optional)

Edit `docker-compose.yml` and uncomment the email processor services:

```yaml
dienstato-email-processor:
  # ... uncomment this entire section

dienstato-report-processor:
  # ... uncomment this entire section
```

Then restart:

```bash
docker-compose up -d
```

## What's Included

- **Main Application**: Runs on port 3000
- **SQLite Database**: Stored in `./data` volume
- **Email System**: Automatic welcome emails and monthly reports
- **Health Checks**: Automatic container monitoring
- **Auto Migrations**: Database updates on startup

## Accessing the Application

1. Open `http://localhost:3000` in your browser
2. Register a new account
3. Create your first calendar
4. Start adding shifts!

## Email Features

Once configured, users can:
- Receive welcome emails on registration
- Enable monthly calendar reports
- Choose which day of the month to receive reports (1-28)
- Get PDF attachments with full calendar details

## Production Deployment

For production with HTTPS:

1. Use a reverse proxy (Nginx/Traefik/Caddy)
2. Update `NEXT_PUBLIC_APP_URL` to your domain
3. Configure SSL certificates
4. Set up automated backups

See `DEPLOYMENT.md` for detailed production setup.

## Backup Your Data

```bash
# Quick backup
docker exec dienstato sqlite3 /app/data/sqlite.db ".backup '/app/data/backup.db'"
docker cp dienstato:/app/data/backup.db ./backup-$(date +%Y%m%d).db

# Or backup the entire data directory
tar -czf dienstato-backup-$(date +%Y%m%d).tar.gz ./data
```

## Troubleshooting

### Check if container is running
```bash
docker ps | grep dienstato
```

### View logs
```bash
docker-compose logs -f dienstato
```

### Restart application
```bash
docker-compose restart dienstato
```

### Check email queue
```bash
docker exec -it dienstato sqlite3 /app/data/sqlite.db \
  "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"
```

## Managing Email Queue

### Process queue manually
```bash
curl -X POST http://localhost:3000/api/emails/process-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Send monthly reports manually
```bash
curl -X POST http://localhost:3000/api/emails/process-monthly-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Next Steps

- Configure email preferences in your profile
- Subscribe to calendars to receive monthly reports
- Set up reverse proxy for HTTPS
- Configure automated backups
- Read `EMAIL_SYSTEM_README.md` for email system details
- Read `DEPLOYMENT.md` for production best practices

## Support

- GitHub: https://github.com/phontary/Dienstato
- Issues: https://github.com/phontary/Dienstato/issues
- Email System Docs: `EMAIL_SYSTEM_README.md`
- Full Deployment Guide: `DEPLOYMENT.md`
