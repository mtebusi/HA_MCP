# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via email to: matt@tebusi.com

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide regular updates on our progress.

## Security Measures

### Authentication & Authorization
- **Token-based authentication** with expiry and rotation
- **CSRF protection** for all state-changing operations
- **Session management** with timeout and secure storage
- **Rate limiting** to prevent brute force attacks

### Input Validation & Sanitization
- **Entity ID validation** to prevent injection attacks
- **Service call whitelisting** to block dangerous operations
- **HTML sanitization** to prevent XSS attacks
- **SQL injection prevention** through parameterized queries
- **Path traversal protection** for file operations

### Network Security
- **TLS/SSL encryption** for all communications
- **WebSocket security** with authentication
- **SSRF prevention** through URL validation
- **Security headers** to prevent common attacks

### Data Protection
- **Secret encryption** at rest
- **Token hashing** with salt
- **Sensitive data redaction** in logs
- **Memory cleanup** for sensitive data

### Container Security
- **AppArmor profile** for isolation
- **Non-root user** execution
- **Minimal base image** to reduce attack surface
- **Resource limits** to prevent DoS

### Monitoring & Logging
- **Audit logging** for security events
- **Intrusion detection** capabilities
- **Error sanitization** to prevent info leakage
- **Security metrics** tracking

## Security Best Practices

### For Users

1. **Use strong passwords**
   - Minimum 12 characters
   - Include uppercase, lowercase, numbers, and symbols
   - Avoid common patterns

2. **Rotate access tokens regularly**
   - Change tokens every 30-90 days
   - Use different tokens for different integrations

3. **Enable entity filtering**
   - Only expose necessary entities
   - Block sensitive entities explicitly

4. **Monitor logs**
   - Check for unauthorized access attempts
   - Review security events regularly

5. **Keep updated**
   - Install security updates promptly
   - Follow security advisories

### For Developers

1. **Never log sensitive data**
   - Tokens, passwords, and secrets must never be logged
   - Sanitize all error messages

2. **Validate all inputs**
   - Never trust user input
   - Use whitelisting over blacklisting

3. **Use security utilities**
   - Import and use the security module
   - Don't implement custom crypto

4. **Test security**
   - Run security tests before commits
   - Perform penetration testing

5. **Follow secure coding practices**
   - Principle of least privilege
   - Defense in depth
   - Fail securely

## Security Checklist

Before each release:

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run security test suite
- [ ] Review code for security issues
- [ ] Update dependencies
- [ ] Test authentication flows
- [ ] Verify input validation
- [ ] Check for sensitive data in logs
- [ ] Validate error handling
- [ ] Test rate limiting
- [ ] Verify CSRF protection
- [ ] Check container security
- [ ] Review AppArmor profile
- [ ] Test resource limits
- [ ] Verify session management
- [ ] Check audit logging

## Compliance

This add-on aims to comply with:

- **OWASP Top 10** - Web Application Security Risks
- **CWE Top 25** - Most Dangerous Software Weaknesses
- **Home Assistant** - Add-on Security Guidelines
- **Docker** - Container Security Best Practices
- **GDPR** - Data Protection (where applicable)

## Security Headers

The following security headers are implemented:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Vulnerability Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 2**: Initial response to reporter
- **Day 7**: Vulnerability confirmed and fix in development
- **Day 14**: Fix tested and prepared for release
- **Day 30**: Fix released and CVE published (if applicable)
- **Day 45**: Public disclosure

## Security Contact

For security concerns, contact:
- Email: matt@tebusi.com
- GitHub Security Advisories: [Create private advisory](https://github.com/mtebusi/HA_MCP/security/advisories/new)
- Response Time: Within 48 hours

## Acknowledgments

We thank the security researchers who have responsibly disclosed vulnerabilities.

---

Last Updated: 2025-08-09
