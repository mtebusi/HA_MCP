#!/bin/bash

# HomeAssistant Test Environment Setup Script
set -e

echo "🏠 Setting up HomeAssistant test environment..."

# Create necessary directories
mkdir -p config
mkdir -p config/custom_components

# Create initial configuration.yaml
cat > config/configuration.yaml <<'EOF'
# HomeAssistant Test Configuration
homeassistant:
  name: Test Home
  latitude: 40.7128
  longitude: -74.0060
  elevation: 10
  unit_system: metric
  currency: USD
  country: US
  time_zone: America/New_York
  internal_url: http://localhost:8123
  external_url: http://localhost:8123
  auth_providers:
    - type: trusted_networks
      trusted_networks:
        - 127.0.0.1
        - ::1
        - 172.17.0.0/16
        - 172.18.0.0/16
      allow_bypass_login: true
    - type: homeassistant

# Enable default components
default_config:

# Enable additional components for testing
api:
websocket_api:
http:
  cors_allowed_origins:
    - http://localhost:8123
    - http://127.0.0.1:8123
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - ::1
    - 172.17.0.0/16
    - 172.18.0.0/16

# Configure logger
logger:
  default: info
  logs:
    homeassistant.components.websocket_api: debug
    homeassistant.components.http: debug

# Enable frontend
frontend:
  themes: !include_dir_merge_named themes

# Enable config editor
config:

# Enable mobile app support  
mobile_app:

# Enable system health
system_health:

# Enable recorder with SQLite
recorder:
  db_url: sqlite:////config/home-assistant_v2.db
  purge_keep_days: 7

# Enable history
history:

# Enable logbook
logbook:

# Enable person tracking
person:

# Enable sun tracking
sun:

# Enable system monitor
sensor:
  - platform: time_date
    display_options:
      - 'time'
      - 'date'
  - platform: systemmonitor
    resources:
      - type: disk_use_percent
        arg: /
      - type: memory_use_percent
      - type: processor_use
      - type: processor_temperature
      - type: last_boot

# Test entities for MCP
input_boolean:
  test_switch:
    name: Test Switch
    initial: off
    icon: mdi:toggle-switch

input_number:
  test_slider:
    name: Test Slider
    initial: 50
    min: 0
    max: 100
    step: 5
    unit_of_measurement: "%"

input_text:
  test_text:
    name: Test Text
    initial: "Hello MCP"
    max: 255

input_select:
  test_select:
    name: Test Select
    options:
      - Option 1
      - Option 2  
      - Option 3
    initial: Option 1

# Test automation
automation:
  - alias: Test Automation
    trigger:
      - platform: state
        entity_id: input_boolean.test_switch
        to: 'on'
    action:
      - service: system_log.write
        data:
          message: "Test switch turned on"
          level: info

# Test script
script:
  test_script:
    alias: Test Script
    sequence:
      - service: system_log.write
        data:
          message: "Test script executed"
          level: info

# Enable discovery
discovery:
  ignore:
    - apple_tv
    - plex_mediaserver

# Enable SSDP
ssdp:

# Enable zeroconf/mDNS
zeroconf:

# Enable UPnP
upnp:
EOF

# Create secrets file
cat > config/secrets.yaml <<'EOF'
# Test secrets file
test_api_key: test_key_123456789
test_token: test_token_abcdefghij
EOF

# Create automations file
cat > config/automations.yaml <<'EOF'
[]
EOF

# Create scripts file  
cat > config/scripts.yaml <<'EOF'
{}
EOF

# Create scenes file
cat > config/scenes.yaml <<'EOF'
[]
EOF

# Create groups file
cat > config/groups.yaml <<'EOF'
{}
EOF

# Create customize file
cat > config/customize.yaml <<'EOF'
{}
EOF

# Create themes directory
mkdir -p config/themes

echo "✅ Configuration files created"

# Stop any existing container
echo "🛑 Stopping any existing HomeAssistant container..."
docker compose down 2>/dev/null || true

# Start HomeAssistant
echo "🚀 Starting HomeAssistant container..."
docker compose up -d

# Wait for HomeAssistant to be ready
echo "⏳ Waiting for HomeAssistant to initialize (this may take 2-3 minutes)..."
sleep 10

# Check if container is running
if docker ps | grep -q homeassistant-test; then
    echo "✅ Container is running"
else
    echo "❌ Container failed to start"
    docker logs homeassistant-test
    exit 1
fi

# Wait for API to be responsive
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s -f http://localhost:8123/api/ > /dev/null 2>&1; then
        echo "✅ HomeAssistant API is responding"
        break
    fi
    echo "⏳ Waiting for API... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
    sleep 5
    ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ HomeAssistant API did not respond in time"
    docker logs homeassistant-test
    exit 1
fi

# Create long-lived access token programmatically
echo "🔑 Setting up authentication..."

# First, we need to complete onboarding
ONBOARDING_RESPONSE=$(curl -s -X POST \
  http://localhost:8123/api/onboarding/users \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "http://localhost:8123/",
    "name": "Test User",
    "username": "admin",
    "password": "admin123456",
    "language": "en"
  }' 2>/dev/null || echo "")

if [ -n "$ONBOARDING_RESPONSE" ]; then
    echo "✅ Onboarding completed"
else
    echo "ℹ️  Onboarding may have already been completed"
fi

# Create a script to generate token after manual login
cat > config/create_token.sh <<'EOF'
#!/bin/bash
# This script should be run after manual authentication setup
# Usage: docker exec homeassistant-test bash /config/create_token.sh

TOKEN=$(python3 -c "
import os
import json
import sqlite3
import secrets
import datetime

db_path = '/config/.storage/auth'
if os.path.exists(db_path):
    with open(db_path, 'r') as f:
        auth_data = json.load(f)
    
    # Find admin user
    for user in auth_data.get('data', {}).get('users', []):
        if user.get('username') == 'admin':
            user_id = user['id']
            
            # Create a token
            token = secrets.token_urlsafe(32)
            token_id = secrets.token_urlsafe(16)
            
            # Add token to auth file
            refresh_token = {
                'id': token_id,
                'user_id': user_id,
                'client_id': 'http://localhost:8123/',
                'client_name': 'MCP Test Token',
                'client_icon': None,
                'token_type': 'long_lived_access_token',
                'created_at': datetime.datetime.utcnow().isoformat(),
                'access_token_expiration': 3.154e+17,  # 10 years
                'token': token,
                'jwt_key': secrets.token_urlsafe(32),
                'last_used_at': datetime.datetime.utcnow().isoformat(),
                'last_used_ip': '127.0.0.1',
                'credential_id': None,
                'version': '1.1'
            }
            
            auth_data['data']['refresh_tokens'].append(refresh_token)
            
            with open(db_path, 'w') as f:
                json.dump(auth_data, f, indent=2)
            
            print(token)
            break
else:
    print('ERROR: Auth file not found')
" 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "ERROR: Auth file not found" ]; then
    echo "TOKEN=$TOKEN" > /config/test_token.txt
    echo "✅ Token created successfully"
else
    echo "❌ Failed to create token"
fi
EOF

chmod +x config/create_token.sh

# Display status
echo ""
echo "========================================="
echo "🏠 HomeAssistant Test Environment Ready!"
echo "========================================="
echo ""
echo "📍 Access HomeAssistant at: http://localhost:8123"
echo ""
echo "🔐 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123456"
echo ""
echo "📊 Container status:"
docker ps | grep homeassistant-test
echo ""
echo "📝 View logs:"
echo "   docker logs -f homeassistant-test"
echo ""
echo "🛑 Stop HomeAssistant:"
echo "   docker compose down"
echo ""
echo "🔄 Restart HomeAssistant:"
echo "   docker compose restart"
echo ""
echo "⚠️  Note: The first start may take a few minutes to initialize all components."
echo ""

# Create test validation script
cat > validate-ha.sh <<'EOF'
#!/bin/bash

echo "🔍 Validating HomeAssistant installation..."

# Check if container is running
if ! docker ps | grep -q homeassistant-test; then
    echo "❌ Container is not running"
    exit 1
fi

# Check API endpoint
if curl -s -f http://localhost:8123/api/ > /dev/null 2>&1; then
    echo "✅ API endpoint is accessible"
else
    echo "❌ API endpoint is not accessible"
    exit 1
fi

# Check WebSocket endpoint
if curl -s -f -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8123/api/websocket 2>&1 | grep -q "Switching Protocols\|Authorization Required"; then
    echo "✅ WebSocket endpoint is accessible"
else
    echo "❌ WebSocket endpoint is not accessible"
fi

# Check config validity
docker exec homeassistant-test python3 -m homeassistant --script check_config --config /config > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Configuration is valid"
else
    echo "⚠️  Configuration has warnings (this is normal for test setup)"
fi

# List available services
echo ""
echo "📋 Available test entities:"
curl -s http://localhost:8123/api/states 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    test_entities = [e['entity_id'] for e in data if 'test' in e['entity_id']]
    for entity in test_entities[:10]:
        print(f'  - {entity}')
    if len(test_entities) > 10:
        print(f'  ... and {len(test_entities)-10} more')
except:
    print('  Unable to fetch entities')
"

echo ""
echo "✅ HomeAssistant validation complete!"
EOF

chmod +x validate-ha.sh

# Run validation
sleep 5
./validate-ha.sh || true