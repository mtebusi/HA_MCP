#!/usr/bin/env python3
"""
Create a long-lived access token for HomeAssistant testing
"""
import requests
import json
import sys

# Configuration
HA_URL = "http://localhost:8123"
USERNAME = "admin"
PASSWORD = "admin123456"

def get_auth_token():
    """Authenticate and get access token"""
    
    # First, authenticate with username/password
    auth_data = {
        "client_id": f"{HA_URL}/",
        "grant_type": "password",
        "username": USERNAME,
        "password": PASSWORD
    }
    
    response = requests.post(
        f"{HA_URL}/auth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=auth_data
    )
    
    if response.status_code == 200:
        auth_response = response.json()
        return auth_response.get("access_token")
    else:
        print(f"Auth failed: {response.status_code} - {response.text}")
        return None

def create_long_lived_token(access_token):
    """Create a long-lived access token"""
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Create long-lived token
    response = requests.post(
        f"{HA_URL}/api/auth/long_lived_access_token",
        headers=headers,
        json={
            "client_name": "MCP Test Token",
            "lifespan": 365  # Days
        }
    )
    
    if response.status_code == 200:
        token_data = response.json()
        return token_data
    else:
        print(f"Token creation failed: {response.status_code} - {response.text}")
        return None

def test_token(token):
    """Test the token by fetching config"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{HA_URL}/api/config",
        headers=headers
    )
    
    if response.status_code == 200:
        config = response.json()
        print(f"✅ Token valid! HomeAssistant version: {config.get('version')}")
        return True
    else:
        print(f"❌ Token test failed: {response.status_code}")
        return False

def main():
    print("🔑 Creating HomeAssistant long-lived access token...")
    
    # Get initial auth token
    print("Authenticating...")
    access_token = get_auth_token()
    
    if not access_token:
        print("❌ Failed to authenticate")
        sys.exit(1)
    
    print("✅ Authenticated successfully")
    
    # Create long-lived token
    print("Creating long-lived token...")
    token_response = create_long_lived_token(access_token)
    
    if not token_response:
        print("❌ Failed to create long-lived token")
        sys.exit(1)
    
    token = token_response
    print(f"✅ Long-lived token created!")
    
    # Test the token
    if test_token(token):
        # Save token to file
        with open("config/test_token.txt", "w") as f:
            f.write(f"SUPERVISOR_TOKEN={token}\n")
            f.write(f"# HomeAssistant URL: {HA_URL}\n")
            f.write(f"# Created for: MCP Test Token\n")
        
        print("\n" + "="*50)
        print("🎉 Token successfully created and saved!")
        print("="*50)
        print(f"\n📍 HomeAssistant URL: {HA_URL}")
        print(f"🔑 Token: {token[:20]}...{token[-10:]}")
        print(f"📄 Saved to: config/test_token.txt")
        print("\nUse this token for MCP server testing:")
        print(f"export SUPERVISOR_TOKEN={token}")
        print(f"export HASSIO_TOKEN={token}")
    else:
        print("❌ Token validation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()