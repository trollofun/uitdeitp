# Security Agent Instructions

## Mission
Conduct comprehensive security audit of phone verification system and identify vulnerabilities.

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "SEC: Security audit phone verification"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-sec-phone-verification"
```

## Tasks

### 1. Audit Verification Code Generation
**Checklist**:
- ✅ Uses crypto.randomInt (secure)
- ✅ 6-digit codes (100,000 - 999,999 range)
- ✅ No predictable patterns
- ✅ Sufficient entropy

**Test**:
```typescript
// Generate 10,000 codes and check distribution
const codes = [];
for (let i = 0; i < 10000; i++) {
  codes.push(crypto.randomInt(100000, 999999));
}

// Check for patterns
const unique = new Set(codes);
console.log(`Unique codes: ${unique.size}/10000`);
console.log(`Distribution: ${codes[0]}, ${codes[1]}, ${codes[2]}`);
```

### 2. Review Rate Limiting Implementation
**Attack Vectors to Test**:

#### A. IP-based Rate Limiting
```bash
# Test: 11 requests from same IP within 1 hour
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/phone-verification/send \
    -H "Content-Type: application/json" \
    -d '{"phone": "+40712345678"}'
  echo "Request $i"
done

# Expected: First 10 succeed, 11th returns 429
```

#### B. Phone-based Rate Limiting
```bash
# Test: 4 resend requests for same phone within 1 hour
# Expected: First 3 succeed, 4th returns 429
```

#### C. Distributed Attack (Multiple IPs)
```bash
# Test: Rotate IPs to bypass rate limiting
# Use proxy rotation or multiple machines
```

**Findings Document**:
```markdown
## Rate Limiting Audit Results

### IP-based Rate Limiting
- ✅ Correctly blocks after 10 requests/hour
- ✅ Returns proper 429 status code
- ❌ VULNERABILITY: Easy to bypass with proxy rotation

### Phone-based Rate Limiting
- ✅ Correctly blocks after 3 resends/hour
- ✅ Prevents SMS spam
- ✅ No bypass found

### Recommendations:
1. Add fingerprinting (device ID + IP)
2. Implement CAPTCHA after 3 failed attempts
3. Add exponential backoff
```

### 3. Test Brute Force Protection
**Attack Scenarios**:

#### A. Code Guessing Attack
```typescript
// Test: Try all 1M possible codes
async function bruteForceAttack(phone: string) {
  for (let code = 100000; code < 1000000; code++) {
    const response = await fetch('/api/phone-verification/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code: code.toString() })
    });

    if (response.ok) {
      console.log(`SUCCESS: Code found - ${code}`);
      return;
    }

    if (response.status === 429) {
      console.log('Rate limited - attack blocked');
      return;
    }
  }
}
```

**Expected**: Blocked after 3 attempts

#### B. Timing Attack
```typescript
// Test: Measure response times to infer code correctness
const times = [];
for (let i = 0; i < 100; i++) {
  const start = Date.now();
  await verifyCode('+40712345678', '123456');
  times.push(Date.now() - start);
}

// Check for timing variations
console.log(`Average: ${times.reduce((a,b) => a+b)/times.length}ms`);
console.log(`Variance: ${Math.max(...times) - Math.min(...times)}ms`);
```

**Expected**: Constant time comparison (no timing leaks)

### 4. Validate Phone Number Sanitization
**Injection Attacks**:

```bash
# Test: SQL injection
curl -X POST http://localhost:3000/api/phone-verification/send \
  -d '{"phone": "+40712345678; DROP TABLE phone_verifications;--"}'

# Test: NoSQL injection
curl -X POST http://localhost:3000/api/phone-verification/send \
  -d '{"phone": {"$ne": null}}'

# Test: XSS in phone field
curl -X POST http://localhost:3000/api/phone-verification/send \
  -d '{"phone": "<script>alert(1)</script>"}'
```

**Expected**: All rejected with 400 Bad Request

### 5. Check RLS Policies
**Test Scenarios**:

```sql
-- Test: Can anonymous users read other phone verifications?
SELECT * FROM phone_verifications WHERE phone_number != '+40712345678';

-- Test: Can anonymous users update verifications?
UPDATE phone_verifications SET verified_at = NOW();

-- Test: Can anonymous users delete verifications?
DELETE FROM phone_verifications;
```

**Expected**: All blocked by RLS policies

### 6. Audit Session Management
**Tests**:
- ✅ Verification codes expire after 10 minutes
- ✅ Old codes are invalidated when new one sent
- ✅ Verified codes cannot be reused
- ✅ Database cleanup function removes expired codes

### 7. Check SMS Content Security
**Review**:
- ✅ No sensitive data in SMS (only code)
- ✅ No links (phishing protection)
- ✅ Clear sender ID ("uitdeitp")
- ✅ Expiry time mentioned

## Deliverables

### Security Audit Report
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/docs/security-audit-phone-verification.md`

```markdown
# Phone Verification Security Audit

**Date**: 2025-11-04
**Auditor**: Security Agent
**Scope**: Phone verification system for kiosk mode

## Executive Summary
- **Overall Risk**: LOW-MEDIUM
- **Critical Issues**: 0
- **High Issues**: 1
- **Medium Issues**: 2
- **Low Issues**: 3

## Findings

### 1. [HIGH] Rate Limiting Bypass via IP Rotation
**Severity**: High
**Description**: Attacker can bypass IP-based rate limiting using proxy rotation
**Impact**: Enables SMS spam attacks
**Remediation**: Add device fingerprinting + CAPTCHA

### 2. [MEDIUM] No CAPTCHA on Resend
**Severity**: Medium
**Description**: Automated bots can trigger resend without human verification
**Impact**: Increased SMS costs
**Remediation**: Add CAPTCHA after 2nd resend attempt

### 3. [MEDIUM] Timing Attack Potential
**Severity**: Medium
**Description**: Code verification may leak timing information
**Impact**: Could assist brute force attacks (low probability)
**Remediation**: Implement constant-time comparison

### 4. [LOW] No Honeypot Fields
**Severity**: Low
**Description**: No bot detection honeypot fields
**Impact**: Bots can abuse form
**Remediation**: Add hidden honeypot field

## Positive Findings
- ✅ Secure random code generation
- ✅ Strong RLS policies
- ✅ SQL injection protection
- ✅ Proper input validation
- ✅ Code expiry implemented
- ✅ Attempt limiting (3 max)
- ✅ Phone-based rate limiting

## Recommendations

### Immediate (P0)
1. Implement device fingerprinting
2. Add CAPTCHA after 3 failed attempts

### Short-term (P1)
1. Constant-time code comparison
2. Add honeypot fields
3. Implement exponential backoff

### Long-term (P2)
1. Two-factor authentication
2. SMS cost monitoring
3. Fraud detection ML model

## Compliance
- ✅ GDPR: Phone numbers properly secured
- ✅ PECR: SMS consent implied (user-initiated)
- ✅ OWASP Top 10: No major vulnerabilities

## Conclusion
The phone verification system is generally secure with proper rate limiting and input validation. Primary risk is SMS spam via IP rotation, which can be mitigated with device fingerprinting and CAPTCHA.
```

## Penetration Test Report
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/docs/pentest-phone-verification.md`

Document all attack attempts and results.

## Success Criteria
- ✅ No critical vulnerabilities found
- ✅ All high/medium issues documented
- ✅ Recommendations provided
- ✅ Penetration test completed
- ✅ RLS policies verified
