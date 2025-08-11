#!/usr/bin/env python3
"""
Test HomeAssistant authentication and generate access token
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import sys

HA_URL = "http://localhost:8123"
USERNAME = "admin"
PASSWORD = "admin123456"

def make_request(url, data=None, headers=None, method="GET"):
    """Make HTTP request with error handling"""
    if headers is None:
        headers = {}
    
    if data is not None:
        if isinstance(data, dict):
            data = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return {"error": "401 Unauthorized"}
        return {"error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": str(e)}

def test_auth_flow():
    """Test the HomeAssistant authentication flow"""
    print("🔐 Testing HomeAssistant Authentication")
    print("=" * 50)
    
    # Step 1: Check API status
    print("\n1. Checking API status...")
    api_check = make_request(f"{HA_URL}/api/")
    if "error" in api_check and "401" in api_check["error"]:
        print("   ⚠️  API requires authentication")
    else:
        print("   ✅ API accessible")
    
    # Step 2: Initialize auth flow
    print("\n2. Initializing authentication flow...")
    flow_data = {
        "client_id": f"{HA_URL}/",
        "redirect_uri": f"{HA_URL}/",
        "handler": ["homeassistant", None]
    }
    
    flow_response = make_request(
        f"{HA_URL}/auth/login_flow",
        data=flow_data,
        method="POST"
    )
    
    if "flow_id" in flow_response:
        flow_id = flow_response["flow_id"]
        print(f"   ✅ Flow ID: {flow_id}")
        
        # Step 3: Submit credentials
        print("\n3. Submitting credentials...")
        cred_data = {
            "username": USERNAME,
            "password": PASSWORD,
            "client_id": f"{HA_URL}/"
        }
        
        auth_response = make_request(
            f"{HA_URL}/auth/login_flow/{flow_id}",
            data=cred_data,
            method="POST"
        )
        
        if "result" in auth_response:
            auth_code = auth_response["result"]
            print(f"   ✅ Auth code received: {auth_code[:20]}...")
            
            # Step 4: Exchange auth code for token
            print("\n4. Exchanging auth code for access token...")
            token_data = urllib.parse.urlencode({
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": f"{HA_URL}/"
            }).encode('utf-8')
            
            token_req = urllib.request.Request(
                f"{HA_URL}/auth/token",
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST"
            )
            
            try:
                with urllib.request.urlopen(token_req) as response:
                    token_response = json.loads(response.read().decode('utf-8'))
                    
                    if "access_token" in token_response:
                        access_token = token_response["access_token"]
                        print(f"   ✅ Access token obtained!")
                        print(f"      Token: {access_token[:30]}...")
                        
                        # Step 5: Test the token
                        print("\n5. Testing access token...")
                        config_response = make_request(
                            f"{HA_URL}/api/config",
                            headers={"Authorization": f"Bearer {access_token}"}
                        )
                        
                        if "version" in config_response:
                            print(f"   ✅ Token valid! HA version: {config_response['version']}")
                            
                            # Step 6: Fetch test entities
                            print("\n6. Fetching test entities...")
                            states_response = make_request(
                                f"{HA_URL}/api/states",
                                headers={"Authorization": f"Bearer {access_token}"}
                            )
                            
                            if isinstance(states_response, list):
                                test_entities = [e for e in states_response if 'test' in e.get('entity_id', '')]
                                print(f"   ✅ Found {len(test_entities)} test entities:")
                                for entity in test_entities[:5]:
                                    entity_id = entity['entity_id']
                                    state = entity['state']
                                    friendly_name = entity.get('attributes', {}).get('friendly_name', entity_id)
                                    print(f"      • {friendly_name}: {state}")
                            
                            # Save token for MCP testing
                            with open("ha_token.txt", "w") as f:
                                f.write(access_token)
                            
                            print("\n" + "=" * 50)
                            print("✅ Authentication successful!")
                            print(f"   Token saved to: ha_token.txt")
                            print(f"   Use this token with MCP server for full functionality")
                            
                            return access_token
                        else:
                            print(f"   ❌ Token test failed: {config_response}")
                    else:
                        print(f"   ❌ No access token in response: {token_response}")
            except Exception as e:
                print(f"   ❌ Token exchange failed: {e}")
        else:
            print(f"   ❌ Authentication failed: {auth_response}")
    else:
        print(f"   ❌ Could not initialize flow: {flow_response}")
    
    return None

def test_mcp_with_token(token):
    """Test MCP server with valid HomeAssistant token"""
    print("\n" + "=" * 50)
    print("🧪 Testing MCP Server with Valid Token")
    print("=" * 50)
    
    MCP_URL = "http://localhost:6789"
    
    # Test getting entities through MCP
    print("\nTesting MCP get_entities tool...")
    mcp_request = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "get_entities",
            "arguments": {
                "entity_ids": ["input_boolean.test_switch"]
            }
        },
        "id": 1
    }
    
    # Note: The test MCP server doesn't actually use the token
    # In production, it would validate and use this token
    response = make_request(
        f"{MCP_URL}/sse",
        data=mcp_request,
        headers={"Authorization": f"Bearer {token}"},
        method="POST"
    )
    
    print(f"MCP Response: {json.dumps(response, indent=2)[:500]}")

if __name__ == "__main__":
    print("HomeAssistant MCP Authentication Test")
    print("=" * 50)
    
    # Test authentication flow
    token = test_auth_flow()
    
    if token:
        # Test MCP with the token
        test_mcp_with_token(token)
    else:
        print("\n❌ Authentication failed - cannot test MCP with valid token")