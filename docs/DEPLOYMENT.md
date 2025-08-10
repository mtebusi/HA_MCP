# Deployment Guide

## Overview

This guide covers deploying the HomeAssistant MCP Server add-on in various environments, from local development to production cloud deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [HomeAssistant Add-on Deployment](#homeassistant-add-on-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [High Availability Setup](#high-availability-setup)
7. [Security Hardening](#security-hardening)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **HomeAssistant**: Version 2024.1.0 or later
- **Node.js**: Version 22.x or 24.x (with --no-node-snapshot flag)
- **Memory**: Minimum 256MB RAM
- **Storage**: 100MB available space
- **Network**: Stable connection to HomeAssistant

### Required Access

- HomeAssistant Administrator access
- Long-lived access token
- Network access between Claude Desktop and MCP Server
- Port 8099 available (for SSE mode)

## Local Deployment

### Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/mtebusi/HA_MCP.git
cd HA_MCP
```

2. **Install dependencies:**
```bash
cd mcp-server
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Build the project:**
```bash
npm run build
```

5. **Run locally:**
```bash
npm start
```

### Local Testing

```bash
# Run with debug output
DEBUG=* npm start

# Test with specific config
HA_TOKEN=your-token HA_URL=http://localhost:8123 npm start

# Run in stdio mode
CONNECTION_MODE=stdio npm start
```

## HomeAssistant Add-on Deployment

### Method 1: Add-on Store (Recommended)

1. **Add Repository:**
   - Settings → Add-ons → Add-on Store
   - Menu (⋮) → Repositories
   - Add: `https://github.com/mtebusi/HA_MCP`

2. **Install Add-on:**
   - Find "HomeAssistant MCP Server" in store
   - Click Install
   - Wait for installation to complete

3. **Configure Add-on:**
   - Click Configuration tab
   - Set your preferences
   - Save configuration

4. **Start Add-on:**
   - Click Start
   - Enable "Start on boot" if desired
   - Check logs for successful startup

### Method 2: Manual Installation

1. **Copy add-on files:**
```bash
# SSH into HomeAssistant
cd /addons
git clone https://github.com/mtebusi/HA_MCP.git homeassistant-mcp
```

2. **Build locally:**
```bash
cd homeassistant-mcp
docker build --build-arg BUILD_FROM="ghcr.io/home-assistant/amd64-base:3.21" -t local/homeassistant-mcp .
```

3. **Install via Supervisor:**
   - Refresh Add-on Store
   - Find in Local Add-ons
   - Install and configure

### Method 3: Git Deployment

```bash
# On HomeAssistant host
cd /addons
git clone https://github.com/mtebusi/HA_MCP.git
ha addons reload
ha addons install local_homeassistant_mcp
```

## Docker Deployment

### Standalone Container

1. **Build image:**
```bash
docker build -t homeassistant-mcp:latest .
```

2. **Run container:**
```bash
docker run -d \
  --name homeassistant-mcp \
  -p 8099:8099 \
  -e HA_TOKEN="your-long-lived-token" \
  -e HA_URL="http://your-ha-instance:8123" \
  -e CONNECTION_MODE="sse" \
  --restart unless-stopped \
  homeassistant-mcp:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  homeassistant-mcp:
    image: ghcr.io/mtebusi/homeassistant-mcp:latest
    container_name: homeassistant-mcp
    restart: unless-stopped
    ports:
      - "8099:8099"
    environment:
      - HA_TOKEN=${HA_TOKEN}
      - HA_URL=${HA_URL}
      - CONNECTION_MODE=sse
      - LOG_LEVEL=info
    volumes:
      - ./config:/config
      - ./data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8099/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Multi-Architecture Build

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t ghcr.io/mtebusi/homeassistant-mcp:latest \
  --push .
```

## Cloud Deployment

### AWS Deployment

1. **ECS Task Definition:**
```json
{
  "family": "homeassistant-mcp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "mcp-server",
    "image": "ghcr.io/mtebusi/homeassistant-mcp:latest",
    "essential": true,
    "portMappings": [{
      "containerPort": 8099,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "CONNECTION_MODE", "value": "sse"},
      {"name": "LOG_LEVEL", "value": "info"}
    ],
    "secrets": [
      {
        "name": "HA_TOKEN",
        "valueFrom": "arn:aws:secretsmanager:region:account:secret:ha-token"
      }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8099/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}
```

2. **ALB Configuration:**
```yaml
LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Scheme: internet-facing
    SecurityGroups:
      - !Ref SecurityGroup
    Subnets:
      - !Ref PublicSubnet1
      - !Ref PublicSubnet2
    
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Port: 8099
    Protocol: HTTP
    HealthCheckPath: /health
    HealthCheckIntervalSeconds: 30
    TargetType: ip
```

### Google Cloud Platform

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: homeassistant-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: homeassistant-mcp
  template:
    metadata:
      labels:
        app: homeassistant-mcp
    spec:
      containers:
      - name: mcp-server
        image: ghcr.io/mtebusi/homeassistant-mcp:latest
        ports:
        - containerPort: 8099
        env:
        - name: CONNECTION_MODE
          value: "sse"
        - name: HA_TOKEN
          valueFrom:
            secretKeyRef:
              name: ha-credentials
              key: token
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: homeassistant-mcp-service
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8099
  selector:
    app: homeassistant-mcp
```

### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name homeassistant-mcp \
  --image ghcr.io/mtebusi/homeassistant-mcp:latest \
  --cpu 0.5 \
  --memory 0.5 \
  --port 8099 \
  --environment-variables \
    CONNECTION_MODE=sse \
    LOG_LEVEL=info \
  --secure-environment-variables \
    HA_TOKEN=$HA_TOKEN \
  --restart-policy Always
```

## High Availability Setup

### Load Balancer Configuration

```nginx
upstream mcp_servers {
    least_conn;
    server mcp1.example.com:8099 max_fails=3 fail_timeout=30s;
    server mcp2.example.com:8099 max_fails=3 fail_timeout=30s;
    server mcp3.example.com:8099 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl;
    server_name mcp.example.com;
    
    ssl_certificate /etc/ssl/certs/mcp.crt;
    ssl_certificate_key /etc/ssl/private/mcp.key;
    
    location / {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
    
    location /health {
        proxy_pass http://mcp_servers/health;
        proxy_connect_timeout 1s;
        proxy_read_timeout 3s;
    }
}
```

### Database Replication (Redis)

```yaml
# Redis for shared cache
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
  networks:
    - mcp-network

mcp-server:
  environment:
    - REDIS_URL=redis://redis:6379
    - CACHE_PROVIDER=redis
```

## Security Hardening

### SSL/TLS Configuration

```dockerfile
# Add SSL support
FROM base AS ssl
RUN apk add --no-cache openssl
COPY ssl/server.crt /ssl/
COPY ssl/server.key /ssl/
ENV SSL_CERT=/ssl/server.crt
ENV SSL_KEY=/ssl/server.key
ENV SSL_ENABLED=true
```

### Network Security

```yaml
# Docker network isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  mcp-server:
    networks:
      - frontend
      - backend
```

### AppArmor Profile

```
#include <tunables/global>

profile homeassistant-mcp flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  
  # Network access
  network tcp,
  network udp,
  
  # File access
  /data/** rw,
  /config/** r,
  /usr/src/app/** r,
  
  # Deny access to sensitive areas
  deny /etc/passwd r,
  deny /etc/shadow r,
  deny /root/** rwklx,
  
  # Allow Node.js
  /usr/local/bin/node ix,
}
```

### Secret Management

```bash
# Kubernetes Secrets
kubectl create secret generic ha-credentials \
  --from-literal=token=$HA_TOKEN \
  --from-literal=url=$HA_URL

# Docker Secrets
echo $HA_TOKEN | docker secret create ha_token -
docker service create \
  --secret ha_token \
  --env HA_TOKEN_FILE=/run/secrets/ha_token \
  homeassistant-mcp
```

## Monitoring Setup

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'homeassistant-mcp'
    static_configs:
      - targets: ['mcp.example.com:8099']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "HomeAssistant MCP Server",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(mcp_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time",
        "targets": [{
          "expr": "histogram_quantile(0.95, mcp_response_time_seconds)"
        }]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [{
          "expr": "mcp_cache_hits / (mcp_cache_hits + mcp_cache_misses)"
        }]
      },
      {
        "title": "WebSocket Status",
        "targets": [{
          "expr": "mcp_websocket_connected"
        }]
      }
    ]
  }
}
```

### Logging Configuration

```yaml
# Fluentd configuration
<source>
  @type forward
  port 24224
</source>

<filter homeassistant-mcp.**>
  @type parser
  key_name log
  <parse>
    @type json
  </parse>
</filter>

<match homeassistant-mcp.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name mcp-logs
  type_name _doc
</match>
```

## Backup and Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Backup configuration
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup add-on config
cp -r /data/options.json $BACKUP_DIR/
cp -r /config/* $BACKUP_DIR/config/

# Backup environment
env | grep -E '^HA_|^MCP_' > $BACKUP_DIR/environment.txt

# Create archive
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR.tar.gz s3://my-backups/mcp-server/

# Cleanup old backups (keep last 30)
find /backup -name "*.tar.gz" -mtime +30 -delete
```

### Recovery Procedure

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
RESTORE_DIR="/tmp/restore"

# Extract backup
mkdir -p $RESTORE_DIR
tar -xzf $BACKUP_FILE -C $RESTORE_DIR

# Restore configuration
cp $RESTORE_DIR/*/options.json /data/
cp -r $RESTORE_DIR/*/config/* /config/

# Restore environment
source $RESTORE_DIR/*/environment.txt

# Restart service
supervisorctl restart mcp-server
```

### Disaster Recovery Plan

1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 15 minutes

```yaml
# DR Configuration
disaster_recovery:
  primary_region: us-east-1
  backup_region: us-west-2
  replication_interval: 3600
  health_check_interval: 60
  auto_failover: true
  
  procedures:
    - verify_backup_integrity
    - restore_configuration
    - validate_connectivity
    - switch_dns_records
    - notify_administrators
```

## Troubleshooting

### Common Deployment Issues

#### Issue: Container won't start
```bash
# Check logs
docker logs homeassistant-mcp

# Common causes:
# - Invalid HA_TOKEN
# - Cannot reach HA_URL
# - Port 8099 already in use

# Solution:
docker run -it --rm \
  -e HA_TOKEN=$HA_TOKEN \
  -e HA_URL=$HA_URL \
  homeassistant-mcp:latest \
  node -e "console.log('Testing connection...')"
```

#### Issue: SSE connection fails
```bash
# Test SSE endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8099/sse

# Check firewall rules
iptables -L -n | grep 8099

# Verify SSL certificate
openssl s_client -connect mcp.example.com:443
```

#### Issue: High memory usage
```bash
# Monitor memory
docker stats homeassistant-mcp

# Adjust Node.js heap size
docker run -e NODE_OPTIONS="--max-old-space-size=256" ...

# Enable memory profiling
docker run -e DEBUG="*" -e PROFILE_MEMORY=true ...
```

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:8099/health

# Detailed health check
curl http://localhost:8099/health?detailed=true

# Readiness check
curl http://localhost:8099/ready

# Liveness check
curl http://localhost:8099/alive
```

### Debug Mode

```bash
# Enable debug logging
docker run -e LOG_LEVEL=debug \
  -e DEBUG="*" \
  homeassistant-mcp:latest

# Enable performance profiling
docker run -e PROFILE=true \
  -e PROFILE_OUTPUT=/data/profile \
  -v ./profile:/data/profile \
  homeassistant-mcp:latest

# Enable trace logging
docker run -e TRACE=true \
  -e TRACE_OUTPUT=/data/trace.log \
  homeassistant-mcp:latest
```

## Performance Tuning

### Container Optimization

```dockerfile
# Multi-stage build optimization
FROM node:22-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

FROM alpine:3.21
RUN apk add --no-cache nodejs
COPY --from=runtime /app/dist ./dist
COPY --from=runtime /app/node_modules ./node_modules
CMD ["node", "--no-node-snapshot", "dist/index.js"]
```

### Resource Limits

```yaml
# Kubernetes resource limits
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Connection Pooling

```typescript
// Optimized connection settings
const config = {
  websocket: {
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
    pingInterval: 30000,
    maxQueueSize: 1000
  },
  cache: {
    maxSize: 10000,
    ttl: 60,
    checkPeriod: 600
  },
  rateLimit: {
    windowMs: 60000,
    max: 100
  }
};
```

## Deployment Checklist

### Pre-Deployment

- [ ] Verify HomeAssistant compatibility
- [ ] Generate long-lived access token
- [ ] Test network connectivity
- [ ] Review security settings
- [ ] Plan backup strategy
- [ ] Configure monitoring
- [ ] Document configuration

### Deployment

- [ ] Deploy add-on/container
- [ ] Verify health endpoints
- [ ] Test Claude Desktop connection
- [ ] Validate entity access
- [ ] Check rate limiting
- [ ] Monitor resource usage
- [ ] Test failover (if HA setup)

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Verify performance metrics
- [ ] Test disaster recovery
- [ ] Document known issues
- [ ] Update runbook
- [ ] Schedule maintenance window
- [ ] Train support team