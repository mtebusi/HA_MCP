# Deployment Guide

Complete guide for deploying the MCP Server for Claude Home Assistant Add-on.

## Table of Contents

- [Deployment Methods](#deployment-methods)
- [Add-on Deployment](#add-on-deployment)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Claude Extension Deployment](#claude-extension-deployment)
- [Update Procedures](#update-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)

## Deployment Methods

### Overview

| Method | Complexity | Use Case | Pros | Cons |
|--------|------------|----------|------|------|
| **Add-on** | Easy | Home Assistant OS | One-click install, Auto-updates | Requires HA OS |
| **Docker** | Medium | Any Docker host | Flexible, Portable | Manual setup |
| **Manual** | Hard | Development | Full control | Complex maintenance |
| **Extension** | Easy | Claude Desktop | Simple config | Limited to Claude |

## Add-on Deployment

### Prerequisites

- Home Assistant OS or Supervised installation
- Version 2024.10.0 or newer
- Administrator access
- 100MB free disk space

### Installation Steps

#### 1. Add Repository

**Method A: One-Click**
```
[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)
```

**Method B: Manual**
1. Navigate to **Settings** → **Add-ons**
2. Click **Add-on Store**
3. Click **⋮** (three dots) → **Repositories**
4. Add: `https://github.com/mtebusi/HA_MCP`
5. Click **Add**

#### 2. Install Add-on

1. Find **MCP Server for Claude** in store
2. Click the add-on
3. Click **Install**
4. Wait for installation to complete

#### 3. Configure Add-on

1. Go to **Configuration** tab
2. Set your preferences:
   ```yaml
   port: 6789
   authentication_required: true
   access_token: "generate-secure-token"
   log_level: info
   connection_timeout: 30
   max_clients: 5
   enable_entity_filtering: false
   allowed_domains: []
   blocked_entities: []
   ```
3. Click **Save**

#### 4. Start Add-on

1. Go to **Info** tab
2. Click **Start**
3. Enable **Start on boot**
4. Enable **Watchdog** (auto-restart on failure)

#### 5. Verify Installation

1. Check **Logs** tab for startup messages
2. Look for: `MCP Server listening on port 6789`
3. Verify no error messages

### Production Configuration

```yaml
# Recommended production settings
port: 6789
authentication_required: true
access_token: "use-very-long-random-token-here"
log_level: warning
connection_timeout: 30
max_clients: 3
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - sensor
  - climate
  - media_player
blocked_entities:
  - switch.critical_infrastructure
  - lock.secure_areas
```

## Docker Deployment

### Prerequisites

- Docker installed
- Docker Compose (optional)
- Network access to Home Assistant

### Standalone Docker

```bash
# Pull image
docker pull ghcr.io/mtebusi/homeassistant-mcp-server:latest

# Run container
docker run -d \
  --name mcp-server \
  --restart unless-stopped \
  -p 6789:6789 \
  -e HOMEASSISTANT_URL="ws://192.168.1.100:8123/api/websocket" \
  -e HOMEASSISTANT_TOKEN="your-long-lived-token" \
  -e MCP_TOKEN="your-access-token" \
  -e LOG_LEVEL="info" \
  ghcr.io/mtebusi/homeassistant-mcp-server:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    image: ghcr.io/mtebusi/homeassistant-mcp-server:latest
    container_name: mcp-server
    restart: unless-stopped
    ports:
      - "6789:6789"
    environment:
      HOMEASSISTANT_URL: "ws://homeassistant.local:8123/api/websocket"
      HOMEASSISTANT_TOKEN: "${HA_TOKEN}"
      MCP_TOKEN: "${MCP_ACCESS_TOKEN}"
      LOG_LEVEL: "info"
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    networks:
      - homeassistant

networks:
  homeassistant:
    external: true
```

Deploy:
```bash
# Create .env file
echo "HA_TOKEN=your-token" > .env
echo "MCP_ACCESS_TOKEN=your-mcp-token" >> .env

# Deploy
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Multi-Architecture Build

```bash
# Build for multiple platforms
docker buildx create --use
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --tag ghcr.io/mtebusi/homeassistant-mcp-server:latest \
  --push .
```

## Manual Deployment

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PM2 or systemd for process management

### Installation

```bash
# Clone repository
git clone https://github.com/mtebusi/HA_MCP.git
cd HA_MCP/mcp-server

# Install dependencies
npm ci --production

# Build
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### Running with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start dist/index.js --name mcp-server

# Save configuration
pm2 save

# Enable startup
pm2 startup
```

### Systemd Service

```ini
# /etc/systemd/system/mcp-server.service
[Unit]
Description=MCP Server for Home Assistant
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node /opt/mcp-server/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

## Claude Extension Deployment

### Package Creation

```bash
cd mcp-server/claude-extension

# Run package script
./package.sh

# Creates: claude-mcp-homeassistant-v1.0.4.tar.gz
```

### Manual Packaging

```bash
# Create package directory
mkdir -p claude-mcp-package

# Copy required files
cp manifest.json claude-mcp-package/
cp config.json claude-mcp-package/
cp connection.json claude-mcp-package/
cp README.md claude-mcp-package/
cp icon.png claude-mcp-package/

# Create archive
tar -czf claude-mcp-homeassistant.tar.gz claude-mcp-package/
```

### Distribution

1. **GitHub Release**
   ```bash
   gh release create v1.0.4 \
     --title "Release v1.0.4" \
     --notes-file RELEASE_NOTES.md \
     claude-mcp-homeassistant-v1.0.4.tar.gz
   ```

2. **Direct Download**
   - Host on CDN
   - Provide download link
   - Include SHA256 checksum

### Installation Instructions

```markdown
## Installing Claude Extension

1. Download the extension package
2. Extract to a temporary directory
3. Copy configuration to Claude Desktop config:
   - macOS: `~/Library/Application Support/Claude/`
   - Windows: `%APPDATA%\Claude\`
   - Linux: `~/.config/Claude/`
4. Merge the configuration
5. Restart Claude Desktop
```

## Update Procedures

### Add-on Updates

#### Automatic Updates
1. Enable auto-update in add-on settings
2. Updates check daily
3. Automatic backup before update

#### Manual Updates
1. Navigate to add-on page
2. Check for updates indicator
3. Click **Update**
4. Review changelog
5. Restart add-on after update

### Docker Updates

```bash
# Pull latest image
docker pull ghcr.io/mtebusi/homeassistant-mcp-server:latest

# Stop current container
docker stop mcp-server

# Remove old container
docker rm mcp-server

# Start new container
docker run -d \
  --name mcp-server \
  [same parameters as before] \
  ghcr.io/mtebusi/homeassistant-mcp-server:latest
```

### Manual Updates

```bash
# Backup current installation
cp -r /opt/mcp-server /opt/mcp-server.backup

# Pull latest code
cd /opt/mcp-server
git pull origin main

# Install dependencies
npm ci --production

# Build
npm run build

# Restart service
sudo systemctl restart mcp-server
```

### Version Management

```bash
# Check current version
cat package.json | grep version

# View available versions
git tag -l

# Switch to specific version
git checkout v1.0.4
npm ci --production
npm run build
```

## Rollback Procedures

### Add-on Rollback

1. **Stop current version**
   ```
   Settings → Add-ons → MCP Server → Stop
   ```

2. **Uninstall add-on**
   ```
   Settings → Add-ons → MCP Server → Uninstall
   ```

3. **Install previous version**
   - Download previous release
   - Upload as local add-on
   - Install and configure

### Docker Rollback

```bash
# Tag current version as backup
docker tag mcp-server:latest mcp-server:backup

# Pull previous version
docker pull ghcr.io/mtebusi/homeassistant-mcp-server:v1.0.3

# Stop and remove current
docker stop mcp-server
docker rm mcp-server

# Run previous version
docker run -d \
  --name mcp-server \
  [parameters] \
  ghcr.io/mtebusi/homeassistant-mcp-server:v1.0.3
```

### Manual Rollback

```bash
# Stop service
sudo systemctl stop mcp-server

# Restore backup
rm -rf /opt/mcp-server
mv /opt/mcp-server.backup /opt/mcp-server

# Start service
sudo systemctl start mcp-server
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:6789/health

# Expected response
{
  "status": "healthy",
  "version": "1.0.4",
  "uptime": 3600
}
```

### Metrics Collection

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['localhost:6789']
    metrics_path: '/metrics'
```

### Log Monitoring

```bash
# Real-time logs
docker logs -f mcp-server

# Log aggregation with Loki
docker run -d \
  --name=loki-docker-driver \
  --log-driver=loki \
  --log-opt loki-url="http://loki:3100/loki/api/v1/push" \
  mcp-server
```

### Alerts

```yaml
# alertmanager.yml
groups:
  - name: mcp-server
    rules:
      - alert: MCPServerDown
        expr: up{job="mcp-server"} == 0
        for: 5m
        annotations:
          summary: "MCP Server is down"
      
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 200000000
        for: 10m
        annotations:
          summary: "MCP Server memory usage is high"
```

## Backup and Recovery

### Backup Strategy

#### What to Backup
- Configuration files
- Access tokens
- Entity filter settings
- Custom scripts

#### Backup Schedule
- Daily: Configuration
- Weekly: Full backup
- Before updates: Snapshot

### Add-on Backup

```bash
# Create backup via CLI
ha backups new --name "MCP-Server-Backup"

# Restore backup
ha backups restore <backup-slug>
```

### Docker Backup

```bash
# Backup configuration
docker cp mcp-server:/app/config ./backup/config

# Backup volumes
docker run --rm \
  -v mcp-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/mcp-data.tar.gz /data
```

### Manual Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/mcp-server/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup application
tar czf $BACKUP_DIR/app.tar.gz /opt/mcp-server

# Backup configuration
cp /opt/mcp-server/.env $BACKUP_DIR/
cp /opt/mcp-server/config.json $BACKUP_DIR/

# Backup systemd service
cp /etc/systemd/system/mcp-server.service $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Procedures

#### From Add-on Backup
1. Install add-on
2. Restore backup from UI
3. Verify configuration
4. Start add-on

#### From Docker Backup
```bash
# Restore configuration
docker cp ./backup/config mcp-server:/app/config

# Restore volumes
docker run --rm \
  -v mcp-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/mcp-data.tar.gz -C /
```

#### From Manual Backup
```bash
# Stop service
sudo systemctl stop mcp-server

# Restore files
tar xzf /backup/mcp-server/20240101/app.tar.gz -C /

# Restore configuration
cp /backup/mcp-server/20240101/.env /opt/mcp-server/

# Start service
sudo systemctl start mcp-server
```

## Production Checklist

### Pre-Deployment

- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Backup strategy defined
- [ ] Monitoring configured
- [ ] Rollback plan ready

### Deployment

- [ ] Backup current system
- [ ] Deploy to staging first
- [ ] Verify functionality
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Document any issues

### Post-Deployment

- [ ] Verify all features working
- [ ] Check performance metrics
- [ ] Review error logs
- [ ] Update documentation
- [ ] Notify users of changes
- [ ] Schedule follow-up review

## Security Considerations

### Network Security
- Use internal networks only
- Implement firewall rules
- Enable authentication always
- Use strong tokens
- Rotate tokens regularly

### Container Security
- Run as non-root user
- Use read-only filesystem
- Limit resource usage
- Enable AppArmor/SELinux
- Regular security updates

### Access Control
- Implement entity filtering
- Block sensitive entities
- Audit access logs
- Monitor unusual activity
- Regular permission reviews

## Support

For deployment assistance:
- [GitHub Issues](https://github.com/mtebusi/HA_MCP/issues)
- [Community Forum](https://community.home-assistant.io/)
- [Discord Support](https://discord.gg/home-assistant)