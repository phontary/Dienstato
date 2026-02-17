# Dienstato Deployment Checklist

This checklist will guide you through deploying Dienstato from your GitHub fork.

## Pre-Deployment Checklist

### 1. Repository Setup

- [x] ✅ Repository forked to: https://github.com/phontary/Dienstato.git
- [x] ✅ docker-compose.yml updated with new repository URL
- [x] ✅ Package name updated to "dienstato"
- [ ] Push all changes to GitHub:
  ```bash
  git add .
  git commit -m "Configure Dienstato for deployment with email system"
  git push origin main
  ```

### 2. Server Requirements

- [ ] Server/VPS with Docker installed (Ubuntu 20.04+ recommended)
- [ ] At least 1GB RAM (2GB recommended)
- [ ] 10GB disk space minimum
- [ ] Domain name (optional, can use IP address)
- [ ] SMTP credentials for sending emails

### 3. Required Credentials

Gather these before deployment:

- [ ] SMTP Host (e.g., smtp.strato.de)
- [ ] SMTP Port (e.g., 465 for SSL)
- [ ] SMTP Username/Email
- [ ] SMTP Password
- [ ] Sender email address
- [ ] Domain name or server IP

## Deployment Steps

### Step 1: Clone Repository on Server

```bash
# SSH into your server
ssh user@your-server-ip

# Clone the repository
git clone https://github.com/phontary/Dienstato.git
cd Dienstato
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

Set these values in `.env`:

```env
# SMTP Configuration
SMTP_HOST=smtp.strato.de
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dienste@sabry.io
SMTP_PASSWORD=your_actual_password
SMTP_FROM_EMAIL=dienste@sabry.io
SMTP_FROM_NAME=Dienstato

# Generate secure secret (run: openssl rand -hex 32)
CRON_SECRET=generated_secret_here

# Your domain or IP
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 3: Create Directories

```bash
mkdir -p data temp
```

### Step 4: Deploy with Docker

#### Option A: Use Deploy Script (Recommended)

```bash
./deploy.sh
```

#### Option B: Manual Deployment

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f dienstato

# Check health
curl http://localhost:3000/api/health
```

### Step 5: Configure Email Processors

Edit `docker-compose.yml` and uncomment these sections:

```yaml
# Uncomment these entire sections:
dienstato-email-processor:
  ...

dienstato-report-processor:
  ...
```

Then restart:

```bash
docker-compose up -d
```

### Step 6: Set Up Reverse Proxy (Production)

#### Using Nginx

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/dienstato
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/dienstato /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Step 8: Set Up Automated Backups

Create backup script:

```bash
sudo nano /usr/local/bin/backup-dienstato.sh
```

Add this content:

```bash
#!/bin/bash
BACKUP_DIR="/backup/dienstato"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker exec dienstato sqlite3 /app/data/sqlite.db ".backup '/app/data/backup-$DATE.db'"
docker cp dienstato:/app/data/backup-$DATE.db $BACKUP_DIR/

# Keep last 7 days
find $BACKUP_DIR -name "backup-*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and add to crontab:

```bash
sudo chmod +x /usr/local/bin/backup-dienstato.sh
sudo crontab -e
```

Add this line (runs daily at 2 AM):

```
0 2 * * * /usr/local/bin/backup-dienstato.sh >> /var/log/dienstato-backup.log 2>&1
```

## Post-Deployment Checklist

### Verify Installation

- [ ] Access application at https://your-domain.com
- [ ] Register a new account
- [ ] Check welcome email received
- [ ] Create a test calendar
- [ ] Add test shifts
- [ ] Export calendar as PDF
- [ ] Configure email preferences
- [ ] Subscribe to calendar for monthly reports

### Verify Email System

```bash
# Check email queue
docker exec dienstato sqlite3 /app/data/sqlite.db \
  "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"

# Process queue manually
curl -X POST https://your-domain.com/api/emails/process-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check delivery logs
docker exec dienstato sqlite3 /app/data/sqlite.db \
  "SELECT * FROM email_delivery_logs ORDER BY created_at DESC LIMIT 10;"
```

### Monitor Application

```bash
# View logs
docker-compose logs -f dienstato

# Check container stats
docker stats dienstato

# Monitor disk space
df -h
```

### Security Hardening

- [ ] Configure firewall (allow only 22, 80, 443)
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```
- [ ] Change default SSH port
- [ ] Disable root SSH login
- [ ] Set up fail2ban
- [ ] Regular updates:
  ```bash
  sudo apt-get update && sudo apt-get upgrade
  ```

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Check application logs for errors
- [ ] Verify email processing is working

**Weekly:**
- [ ] Review system resources (CPU, RAM, disk)
- [ ] Check backup status
- [ ] Review email queue for stuck emails

**Monthly:**
- [ ] Update system packages
- [ ] Pull latest code from GitHub
- [ ] Rebuild Docker containers
- [ ] Test backup restoration

### Update Application

```bash
cd Dienstato
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f dienstato
```

### Restore from Backup

```bash
# Stop application
docker-compose down

# Restore database
cp /backup/dienstato/backup-YYYYMMDD-HHMMSS.db ./data/sqlite.db

# Start application
docker-compose up -d
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs dienstato

# Check disk space
df -h

# Verify environment variables
docker-compose config

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Emails Not Sending

```bash
# Check SMTP settings
docker-compose exec dienstato env | grep SMTP

# Check email queue
docker exec dienstato sqlite3 /app/data/sqlite.db \
  "SELECT * FROM email_queue WHERE status='failed';"

# Check delivery logs
docker exec dienstato sqlite3 /app/data/sqlite.db \
  "SELECT * FROM email_delivery_logs WHERE status='failed' ORDER BY created_at DESC LIMIT 10;"

# Test SMTP manually
docker-compose exec dienstato npm run test:smtp
```

### Database Corruption

```bash
# Check integrity
docker exec dienstato sqlite3 /app/data/sqlite.db "PRAGMA integrity_check;"

# If corrupt, restore from backup
docker-compose down
cp /backup/dienstato/backup-LATEST.db ./data/sqlite.db
docker-compose up -d
```

## Support Resources

- **Documentation:**
  - Quick Start: `DOCKER_DEPLOYMENT_QUICK_START.md`
  - Full Guide: `DEPLOYMENT.md`
  - Email System: `EMAIL_SYSTEM_README.md`

- **Community:**
  - GitHub Issues: https://github.com/phontary/Dienstato/issues
  - GitHub Discussions: https://github.com/phontary/Dienstato/discussions

- **Monitoring:**
  - Application Logs: `docker-compose logs -f dienstato`
  - System Logs: `/var/log/syslog`
  - Nginx Logs: `/var/log/nginx/`

## Success Criteria

Your deployment is successful when:

✅ Application is accessible at your domain
✅ HTTPS is working with valid certificate
✅ Users can register and login
✅ Welcome emails are being sent
✅ Email queue is processing automatically
✅ Backups are running daily
✅ Health checks are passing
✅ No errors in application logs

## Next Steps

After successful deployment:

1. **Announce** - Share your Dienstato instance with your team
2. **Monitor** - Watch logs and metrics for the first week
3. **Optimize** - Adjust resources based on usage
4. **Customize** - Configure additional features as needed
5. **Contribute** - Report bugs or submit improvements to GitHub

---

**Deployment Date:** ________________

**Domain:** ________________

**Admin Email:** ________________

**Notes:** ___________________________________________________________
