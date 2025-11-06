# Incident Response Procedures - Phone Verification System

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Owner:** Security Team
**Review Schedule:** Quarterly

---

## 1. Incident Classification Matrix

### Severity Levels

| Level | Name | Impact | Examples | Response Time | Escalation |
|---|---|---|---|---|---|
| **P0** | Critical | System-wide breach, data exposed | DB compromise, API key leak, mass SMS spam | **15 minutes** | CEO, CTO, Legal |
| **P1** | High | Service degradation, targeted attacks | SMS bombing, brute-force attempts, DDoS | **1 hour** | CTO, DevOps Lead |
| **P2** | Medium | Suspicious activity, potential threats | Rate limit evasion, enumeration attempts | **4 hours** | Security Team |
| **P3** | Low | Minor anomalies, false positives | Single failed verification, slow response | **24 hours** | On-call Engineer |

---

## 2. Incident Response Team (IRT)

### Core Team

| Role | Name | Contact | Responsibility |
|---|---|---|---|
| **Incident Commander** | [CTO Name] | +40 XXX XXX XXX | Overall coordination, final decisions |
| **Security Lead** | [Security Engineer] | security@uitdeitp.ro | Technical investigation, forensics |
| **DevOps Lead** | [DevOps Engineer] | devops@uitdeitp.ro | System recovery, infrastructure |
| **Legal Counsel** | [Lawyer Name] | legal@uitdeitp.ro | GDPR compliance, ANSPDCP notification |
| **Communications** | [PR Manager] | pr@uitdeitp.ro | Public disclosure, user communication |
| **DPO** | [DPO Name] | dpo@uitdeitp.ro | Data protection, regulatory compliance |

### Extended Team (On-Call)
- **Database Admin**: Database forensics and recovery
- **NotifyHub Contact**: SMS gateway coordination
- **Supabase Support**: Infrastructure support (support@supabase.io)

---

## 3. P0 Incident: Data Breach

### Definition
Unauthorized access to:
- Phone verification codes (active or historical)
- User phone numbers (PII)
- IP addresses or user agents
- Database credentials or API keys

---

### Phase 1: Detection and Containment (0-15 minutes)

#### Step 1: Immediate Actions (First 5 minutes)
```bash
# 1. Activate incident response
./scripts/incident-response.sh --severity P0 --type data-breach

# 2. Disable verification system via feature flag
curl -X POST https://api.uitdeitp.ro/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"PHONE_VERIFICATION_ENABLED": false}'

# 3. Revoke NotifyHub API key
curl -X DELETE https://ntf.uitdeitp.ro/api/keys/$CURRENT_KEY_ID \
  -H "Authorization: Bearer $MASTER_KEY"
```

#### Step 2: Alert Key Personnel (Minutes 5-10)
```javascript
// Automated alerting script
const alertChannels = [
  { type: 'sms', recipients: ['+40XXX', '+40YYY'] },
  { type: 'email', recipients: ['cto@', 'security@', 'legal@'] },
  { type: 'slack', channel: '#incident-response' },
  { type: 'phone', recipients: ['+40XXX'] } // Voice call for P0
];

await sendAlert({
  severity: 'P0',
  incident: 'Data Breach Detected',
  timestamp: new Date().toISOString(),
  initialReport: 'Phone verification database potentially compromised',
  channels: alertChannels
});
```

#### Step 3: Preserve Evidence (Minutes 10-15)
```bash
# 1. Capture database snapshot
pg_dump uitdeitp_production > /forensics/db_snapshot_$(date +%Y%m%d_%H%M%S).sql

# 2. Collect server logs (last 24 hours)
journalctl --since "24 hours ago" > /forensics/system_logs_$(date +%Y%m%d_%H%M%S).log

# 3. Export security audit logs
psql -d uitdeitp_production -c "COPY (SELECT * FROM security_audit_log WHERE created_at > NOW() - INTERVAL '24 hours') TO '/forensics/security_audit_$(date +%Y%m%d_%H%M%S).csv' CSV HEADER;"

# 4. Capture network traffic (tcpdump)
tcpdump -i eth0 -w /forensics/network_capture_$(date +%Y%m%d_%H%M%S).pcap &
TCPDUMP_PID=$!
```

---

### Phase 2: Investigation (15 minutes - 1 hour)

#### Step 4: Identify Breach Scope
```sql
-- Query 1: Count potentially compromised verifications
SELECT
  COUNT(*) AS total_verifications,
  COUNT(DISTINCT phone_number) AS unique_phones,
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Query 2: Identify suspicious access patterns
SELECT
  ip_address,
  COUNT(*) AS access_count,
  COUNT(DISTINCT phone_number) AS unique_phones,
  array_agg(DISTINCT phone_number) AS phones_accessed
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 50  -- Suspicious threshold
ORDER BY access_count DESC;

-- Query 3: Check for unauthorized database connections
SELECT
  datname,
  usename,
  client_addr,
  backend_start,
  state,
  query
FROM pg_stat_activity
WHERE datname = 'uitdeitp_production'
  AND usename NOT IN ('uitdeitp_app', 'postgres')  -- Authorized users
ORDER BY backend_start DESC;
```

#### Step 5: Root Cause Analysis
**Check for common breach vectors:**

1. **SQL Injection**
   ```bash
   grep -r "SQL.*injection\|UNION\|DROP\|INSERT" /var/log/application/
   ```

2. **Exposed API Keys**
   ```bash
   # Check if secrets were committed to Git
   git log --all --full-history --source --grep="NOTIFYHUB_API_KEY\|SUPABASE_SERVICE_ROLE"

   # Check environment variable exposure
   curl -s https://uitdeitp.ro/.env || echo "Protected"
   curl -s https://uitdeitp.ro/api/config || echo "Protected"
   ```

3. **Compromised Dependencies**
   ```bash
   npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical")'
   ```

4. **Social Engineering / Phishing**
   - Review admin login attempts
   - Check for suspicious password reset requests

---

### Phase 3: Notification (1 hour - 24 hours)

#### Step 6: Notify Affected Users (Within 1 hour)
```javascript
// SMS notification to affected users
const affectedUsers = await getAffectedPhoneNumbers();

for (const phone of affectedUsers) {
  await notifyHub.sendSMS({
    to: phone,
    body: `ALERTĂ SECURITATE uitdeITP: Datele dvs. de verificare au fost compromise.
           Pentru detalii și pași de protecție, accesați: https://uitdeitp.ro/security/incident-2025-001
           Cod incident: SEC-2025-001. Support: security@uitdeitp.ro`,
    priority: 'high'
  });
}

// Email notification (if user has account)
await sendEmailNotifications(affectedUsers, {
  subject: 'URGENT: Alertă de Securitate - Datele Dumneavoastră Au Fost Compromise',
  template: 'data-breach-notification',
  variables: {
    incidentCode: 'SEC-2025-001',
    breachDate: new Date().toISOString(),
    dataExposed: ['Număr telefon', 'Cod verificare (expirat)', 'Adresă IP'],
    actionRequired: 'Verificați activitatea suspectă pe contul dumneavoastră'
  }
});
```

**User Notification Template:**
```
Subiect: URGENT: Alertă de Securitate uitdeITP

Bună ziua,

Vă contactăm pentru a vă informa despre un incident de securitate care a afectat
sistemul nostru de verificare a numărului de telefon.

DETALII INCIDENT:
- Data: 4 Noiembrie 2025, ora 14:30 EET
- Tip: Acces neautorizat la date de verificare
- Date afectate: Număr de telefon, cod de verificare (expirat), adresă IP
- Nr. utilizatori afectați: [NUMĂR]

ACȚIUNI LUATE:
✅ Sistemul de verificare a fost dezactivat imediat
✅ Chei API revocate
✅ Investigație de securitate în curs
✅ Autorități notificate (ANSPDCP)

CE TREBUIE SĂ FACEȚI:
1. Verificați activitatea recentă pe contul dumneavoastră uitdeITP
2. Dacă observați activitate suspectă, contactați-ne imediat la security@uitdeitp.ro
3. Fiți atenți la mesaje SMS suspecte care pretind a fi de la uitdeITP
4. NU răspundeți la solicitări de informații personale prin SMS/email

CONTACT:
Email: security@uitdeitp.ro
Telefon: +40 XXX XXX XXX (program: 09:00-21:00)
Status: https://status.uitdeitp.ro

Ne cerem scuze pentru acest incident și vă asigurăm că luăm toate măsurile
necesare pentru a preveni repetarea acestuia.

Cu respect,
Echipa uitdeITP

Cod incident: SEC-2025-001
Data notificare: 4 Noiembrie 2025, 15:30 EET
```

---

#### Step 7: Notify ANSPDCP (Within 72 hours - GDPR Requirement)

**Threshold for notification (Art. 33 GDPR):**
- ✅ Breach affects >100 users, OR
- ✅ High risk to rights/freedoms (e.g., phone numbers + codes exposed), OR
- ✅ Special categories of data (not applicable here)

**Notification Form:**
```
To: anspdcp@dataprotection.ro
Subject: Notificare Încălcare Securitate Date - SC UITDEITP SRL

Conformând cu Art. 33 din GDPR, vă notificăm următorul incident:

1. OPERATOR DATE:
   Denumire: SC UITDEITP SRL
   CUI: [Cod]
   Adresă: [Adresă]
   DPO: dpo@uitdeitp.ro

2. NATURA ÎNCĂLCĂRII:
   Tip: Acces neautorizat la baza de date phone_verifications
   Data detectării: 4 Noiembrie 2025, 14:30 EET
   Durata estimată: 2 ore (12:30-14:30)

3. CATEGORII DATE AFECTATE:
   - Numere de telefon (format +40XXXXXXXXX)
   - Coduri de verificare (6 cifre, expirate, single-use)
   - Adrese IP (hashate în majoritatea cazurilor)
   - Timestamp-uri

4. NUMĂR PERSOANE AFECTATE:
   [NUMĂR] persoane fizice

5. CONSECINȚE PROBABILE:
   - Risc scăzut: Codurile au expirat în 10 minute, single-use
   - Risc mediu: Numere de telefon expuse (pot fi folosite pentru phishing)
   - Risc scăzut: IP-uri hashate, nu pot fi reverse

6. MĂSURI LUATE:
   - Sistem dezactivat imediat (15 minute de la detectare)
   - Chei API revocate
   - Utilizatori notificați prin SMS și email (1 oră de la detectare)
   - Investigație forensică în curs
   - Patch de securitate implementat

7. MĂSURI PROPUSE:
   - Re-audit complet securitate
   - Implementare SIEM (Security Information and Event Management)
   - Training securitate pentru echipă
   - Penetration testing lunar

8. CONTACT:
   Email: dpo@uitdeitp.ro
   Telefon: +40 XXX XXX XXX

Sunteți rugați să confirmați primirea acestei notificări.

Cu respect,
[Nume DPO]
Data Protection Officer
SC UITDEITP SRL
```

---

### Phase 4: Recovery (24 hours - 7 days)

#### Step 8: Implement Security Fixes
```bash
# 1. Patch vulnerabilities
git checkout -b hotfix/security-breach-response
# ... implement fixes ...
git commit -m "Security: Fix breach vector [SEC-2025-001]"
git push origin hotfix/security-breach-response

# 2. Generate new API keys
NEW_NOTIFYHUB_KEY=$(openssl rand -hex 32)
echo "NOTIFYHUB_API_KEY=$NEW_NOTIFYHUB_KEY" >> .env.production

# 3. Rotate database credentials
psql -U postgres -c "ALTER USER uitdeitp_app WITH PASSWORD '$(openssl rand -base64 32)';"

# 4. Update Supabase RLS policies
psql -d uitdeitp_production -f security-patches/rls-update.sql

# 5. Enable enhanced monitoring
./scripts/enable-monitoring.sh --mode paranoid
```

#### Step 9: Security Re-Audit
```bash
# Run full security audit
./scripts/security-audit.sh --full --output /audits/post-incident-audit.html

# Penetration testing
npm run pentest -- --aggressive

# Dependency audit
npm audit --production
```

#### Step 10: Gradual Service Restoration
```javascript
// Phase 1: Restore for internal testing (Day 1)
await enableFeatureFlag('PHONE_VERIFICATION_ENABLED', {
  enabled: true,
  rollout: { internal_only: true }
});

// Phase 2: Beta users (Day 2)
await enableFeatureFlag('PHONE_VERIFICATION_ENABLED', {
  enabled: true,
  rollout: { percentage: 10, whitelist: ['beta-testers'] }
});

// Phase 3: Gradual rollout (Days 3-5)
await enableFeatureFlag('PHONE_VERIFICATION_ENABLED', {
  enabled: true,
  rollout: { percentage: 50 }
});

// Phase 4: Full restoration (Day 7)
await enableFeatureFlag('PHONE_VERIFICATION_ENABLED', {
  enabled: true,
  rollout: { percentage: 100 }
});
```

---

### Phase 5: Post-Incident (7-30 days)

#### Step 11: Post-Mortem Report
**Template:** `/docs/security/post-mortems/SEC-2025-001.md`

```markdown
# Post-Mortem: Data Breach SEC-2025-001

## Incident Summary
- **Date**: 2025-11-04
- **Duration**: 2 hours (12:30-14:30 EET)
- **Impact**: [NUMBER] users affected
- **Severity**: P0 (Critical)

## Timeline
| Time | Event |
|---|---|
| 12:30 | Breach begins (attacker gains access) |
| 14:28 | Anomaly detected by monitoring system |
| 14:30 | Security team notified |
| 14:35 | System disabled, investigation started |
| 14:45 | API keys revoked |
| 15:30 | Users notified via SMS/email |
| 16:00 | ANSPDCP notification initiated |
| 18:00 | Root cause identified |
| 20:00 | Security patch deployed |
| Nov 11 | Service fully restored |

## Root Cause
[DETAILED TECHNICAL EXPLANATION]

## What Went Well
- ✅ Detection within 2 hours
- ✅ Containment within 5 minutes of detection
- ✅ User notification within 1 hour
- ✅ ANSPDCP notification within 72 hours (compliant)

## What Went Poorly
- ❌ No real-time alerting (2-hour detection delay)
- ❌ Insufficient logging (forensics difficult)
- ❌ No automated incident response playbook

## Action Items
1. **Immediate (Week 1)**:
   - [ ] Implement SIEM (Security Information and Event Management)
   - [ ] Setup real-time anomaly detection
   - [ ] Enable 2FA for all admin accounts

2. **Short-term (Month 1)**:
   - [ ] Quarterly penetration testing
   - [ ] Security training for all engineers
   - [ ] Automated incident response scripts

3. **Long-term (Quarter 1)**:
   - [ ] Bug bounty program
   - [ ] ISO 27001 certification
   - [ ] Dedicated security engineer hire

## Lessons Learned
[KEY TAKEAWAYS]

## Cost Analysis
- Direct costs: [AMOUNT] RON (SMS notifications, emergency response)
- Indirect costs: [AMOUNT] RON (engineering time, legal fees)
- Potential fines: Up to 20M EUR or 4% of global turnover (GDPR Art. 83)

## Status: CLOSED
**Closed by:** [Incident Commander]
**Closed on:** 2025-11-30
**Approved by:** CEO, CTO, DPO
```

---

## 4. P1 Incident: SMS Bombing Attack

### Definition
Abnormal SMS volume indicating abuse:
- >100 SMS/minute globally
- >10 SMS/minute to same phone
- Coordinated attack from multiple IPs

---

### Response Procedure (1 hour SLA)

#### Phase 1: Detection (0-15 minutes)
```javascript
// Automated alert trigger
if (await getSMSRatePerMinute() > 100) {
  await triggerIncident({
    severity: 'P1',
    type: 'sms-bombing',
    metrics: {
      smsPerMinute: await getSMSRatePerMinute(),
      uniquePhones: await getUniquePhoneCount(),
      uniqueIPs: await getUniqueIPCount()
    }
  });
}
```

#### Phase 2: Analysis (15-30 minutes)
```sql
-- Identify attack pattern
SELECT
  ip_address,
  COUNT(*) AS requests,
  COUNT(DISTINCT phone_number) AS unique_phones,
  array_agg(DISTINCT phone_number ORDER BY phone_number) AS phones
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY ip_address
HAVING COUNT(*) > 20
ORDER BY requests DESC
LIMIT 10;
```

#### Phase 3: Mitigation (30-45 minutes)
```bash
# Option 1: Block malicious IPs at firewall level
for ip in "${MALICIOUS_IPS[@]}"; do
  iptables -A INPUT -s $ip -j DROP
  echo "Blocked IP: $ip"
done

# Option 2: Temporarily increase rate limits (if legitimate spike)
psql -d uitdeitp_production -c "
  CREATE TEMP TABLE rate_limit_override (
    phone_number TEXT,
    max_requests INT DEFAULT 10,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
  );
"

# Option 3: Enable CAPTCHA for all requests
./scripts/enable-captcha.sh --mode strict
```

#### Phase 4: Communication (45-60 minutes)
```markdown
**Status Page Update:**

⚠️ Increased SMS Verification Delays

We're experiencing higher than normal traffic on our SMS verification system,
which may cause delays in receiving your verification code.

- Status: Investigating
- Impact: 5-10 minute delays in SMS delivery
- Workaround: Please wait and retry in 15 minutes

Updates: https://status.uitdeitp.ro
```

---

## 5. P2 Incident: Rate Limit Evasion

### Definition
Attacker bypassing rate limits using:
- VPN/Proxy rotation
- Distributed botnet
- Time-based attacks (slow requests)

---

### Response Procedure (4 hour SLA)

#### Detection
```javascript
// Pattern analysis
const suspiciousPatterns = await analyzeBehavior({
  timeWindow: '1 hour',
  indicators: [
    'multiple_ips_same_phone',
    'sequential_phone_numbers',
    'regular_time_intervals',
    'identical_user_agents'
  ]
});

if (suspiciousPatterns.score > 0.8) {
  await triggerIncident({ severity: 'P2', type: 'rate-limit-evasion' });
}
```

#### Mitigation
```typescript
// Implement device fingerprinting
const deviceId = await generateDeviceFingerprint(req);

// Add device-based rate limiting
await checkRateLimit(`device:${deviceId}`, {
  maxRequests: 5,
  windowMs: 3600000 // 1 hour
});

// Enable progressive CAPTCHA (harder challenges for suspicious users)
if (suspiciousPatterns.score > 0.6) {
  await requireCaptcha(req, { difficulty: 'hard' });
}
```

---

## 6. Communication Templates

### Internal Incident Alert (Slack/Email)
```
🚨 SECURITY INCIDENT [P0]

Incident ID: SEC-2025-001
Type: Data Breach - Phone Verification System
Detected: 2025-11-04 14:30 EET
Status: ACTIVE - Containment in progress

Impact:
- Phone verification system OFFLINE
- ~[NUMBER] users potentially affected
- Data exposed: Phone numbers, verification codes (expired)

Actions Taken:
✅ System disabled (14:35)
✅ API keys revoked (14:45)
⏳ User notification in progress

Next Steps:
- [ ] Complete forensic analysis (ETA: 16:00)
- [ ] Notify ANSPDCP (Deadline: Nov 7, 14:30)
- [ ] Deploy security patch (ETA: 18:00)

War Room: https://meet.google.com/xxx-yyyy-zzz
Dashboard: https://dashboard.uitdeitp.ro/incidents/SEC-2025-001

Do NOT discuss publicly until Communications approves disclosure.
```

---

### Public Disclosure (Blog Post)
```markdown
# Security Incident Disclosure: SEC-2025-001

**Published:** November 4, 2025
**Last Updated:** November 11, 2025

## What Happened

On November 4, 2025, at approximately 14:30 EET, we detected unauthorized access
to our phone verification database. We immediately disabled the affected system
and began an investigation.

## What Data Was Affected

The breach potentially exposed:
- Phone numbers (format: +40XXXXXXXXX)
- Verification codes (6-digit, expired within 10 minutes, single-use)
- IP addresses (most were hashed)
- Timestamps of verification requests

**What was NOT affected:**
- Passwords
- Payment information
- Vehicle ITP data
- Email addresses

## How Many Users Were Affected

Approximately [NUMBER] users who requested phone verification between
November 4, 12:30-14:30 EET may have been affected.

## What We've Done

- ✅ Disabled phone verification system within 5 minutes of detection
- ✅ Revoked all API keys
- ✅ Notified affected users via SMS and email
- ✅ Reported to Romanian Data Protection Authority (ANSPDCP)
- ✅ Conducted full security audit
- ✅ Implemented additional security measures
- ✅ Service restored on November 11 after thorough testing

## What You Should Do

If you received a notification from us:
1. Be cautious of suspicious SMS messages claiming to be from uitdeITP
2. We will NEVER ask for your password or payment info via SMS
3. If you notice unauthorized activity on your account, contact us immediately

## What We're Doing to Prevent This

- 24/7 security monitoring with real-time alerts
- Enhanced intrusion detection systems
- Quarterly penetration testing
- Security training for all team members
- Bug bounty program (launching soon)

## Contact

If you have questions or concerns:
- Email: security@uitdeitp.ro
- Phone: +40 XXX XXX XXX

We apologize for this incident and are committed to protecting your data.

---
SC UITDEITP SRL
Incident ID: SEC-2025-001
```

---

## 7. Incident Response Checklist

### P0 - Critical (15 minute SLA)
- [ ] Activate incident response team (5 min)
- [ ] Disable affected systems (5 min)
- [ ] Revoke compromised credentials (10 min)
- [ ] Preserve forensic evidence (15 min)
- [ ] Alert executives (15 min)
- [ ] Notify affected users (1 hour)
- [ ] Notify ANSPDCP (72 hours)

### P1 - High (1 hour SLA)
- [ ] Identify attack pattern (15 min)
- [ ] Implement mitigation (30 min)
- [ ] Update status page (45 min)
- [ ] Alert security team (1 hour)

### P2 - Medium (4 hour SLA)
- [ ] Analyze suspicious activity (1 hour)
- [ ] Implement countermeasures (2 hours)
- [ ] Document findings (4 hours)

### P3 - Low (24 hour SLA)
- [ ] Investigate anomaly (4 hours)
- [ ] Determine if false positive (8 hours)
- [ ] Update monitoring rules (24 hours)

---

## 8. Post-Incident Procedures

### Mandatory Actions
1. **Post-Mortem Meeting** (within 7 days)
   - All IRT members present
   - Timeline reconstruction
   - Root cause analysis
   - Action items assigned

2. **Security Audit** (within 14 days)
   - Full system review
   - Penetration testing
   - Dependency audit

3. **Training Update** (within 30 days)
   - Incident response drill
   - Security awareness training
   - Update runbooks

4. **Compliance Review** (within 30 days)
   - GDPR compliance check
   - ANSPDCP follow-up
   - Legal review

---

## 9. Contact Directory

### Emergency Contacts (24/7)
| Service | Contact | Use For |
|---|---|---|
| **On-Call Engineer** | +40 XXX XXX XXX | Immediate technical response |
| **Security Hotline** | security@uitdeitp.ro | Reporting security issues |
| **Incident Commander** | +40 YYY YYY YYY | Escalation, final decisions |

### External Contacts
| Organization | Contact | Purpose |
|---|---|---|
| **ANSPDCP** | anspdcp@dataprotection.ro<br>+40 318 059 211 | Data breach notification |
| **NotifyHub Support** | support@notifyhub.ro | SMS gateway issues |
| **Supabase Support** | support@supabase.io | Database infrastructure |
| **Cloudflare Support** | support@cloudflare.com | DDoS mitigation |

---

**Document Owner:** Security Team
**Approved By:** CTO, DPO, Legal Counsel
**Next Review:** 2025-02-04
**Version:** 1.0.0
