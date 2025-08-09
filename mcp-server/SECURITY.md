# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. Email the details to: matt@tebusi.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

## Security Features

### Authentication
- Token-based authentication with configurable timeout
- Supervisor token validation for API access
- Optional authentication bypass for trusted networks

### Transport Security
- Uses stdio transport instead of network TCP
- WebSocket connections to Supervisor API only
- No external network access required

### Access Control
- Entity-level filtering (domains and specific entities)
- Read-only access to configuration files
- Service call validation and sanitization

### Rate Limiting
- 100 requests per minute per tool
- Connection limits (max 5 concurrent)
- Automatic backoff on errors

### Input Validation
- All user inputs sanitized
- Template injection prevention
- Path traversal protection
- Command injection prevention

### Memory Protection
- TTL cache with automatic cleanup
- Memory leak prevention
- Resource usage monitoring

### Container Security
- AppArmor profile (when enabled)
- Read-only filesystem mounts
- Minimal container privileges
- No root access

## Security Best Practices

### For Users

1. **Use Strong Tokens**
   - Generate long, random access tokens
   - Rotate tokens regularly
   - Never share tokens publicly

2. **Enable Entity Filtering**
   - Block sensitive entities (locks, alarms, cameras)
   - Limit to necessary domains
   - Review exposed entities regularly

3. **Monitor Access**
   - Check add-on logs regularly
   - Monitor for unusual activity
   - Set up alerts for critical actions

4. **Network Security**
   - Use VPN for remote access
   - Enable Home Assistant 2FA
   - Keep Home Assistant updated

### For Developers

1. **Code Security**
   - Never log sensitive data
   - Validate all inputs
   - Use parameterized queries
   - Implement proper error handling

2. **Dependencies**
   - Keep dependencies updated
   - Audit dependency vulnerabilities
   - Use lock files for reproducible builds

3. **Testing**
   - Include security tests
   - Test with malicious inputs
   - Verify access controls
   - Check for information leakage

## Security Audit Checklist

- [ ] Authentication enabled and working
- [ ] Entity filtering configured appropriately
- [ ] Logs reviewed for sensitive data exposure
- [ ] Network access properly restricted
- [ ] Dependencies up to date
- [ ] Error messages don't leak information
- [ ] Rate limiting functioning
- [ ] Input validation comprehensive

## Compliance

This add-on aims to comply with:
- Home Assistant Add-on Security Requirements
- Docker Security Best Practices
- OWASP Security Guidelines

## Security Updates

Security updates are released as patch versions (x.x.PATCH) and should be installed immediately.

Monitor for updates:
- GitHub Releases
- Home Assistant Add-on Store
- Security Advisory emails (if subscribed)

## Contact

Security Team: matt@tebusi.com
PGP Key: Available upon request