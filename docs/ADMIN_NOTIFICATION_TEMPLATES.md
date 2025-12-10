# Guide: Customizing Notification Templates for White-Label Stations

**For Station Admins and White-Label Partners**

---

## Overview

As a white-label station partner (€49/month subscription), you can fully customize SMS and email notification messages sent to your clients. This allows you to:

- Include your station's branding and contact information
- Use your own tone of voice (formal, friendly, urgent)
- Highlight your unique services
- Build stronger client relationships

---

## Accessing Template Editor

1. **Login to Admin Panel**: `https://uitdeitp.ro/admin`
2. **Navigate to Stations**: Go to "Stații" in the sidebar
3. **Edit Your Station**: Click on your station name
4. **Scroll to Templates Section**: "Template-uri Notificări"

---

## Available Variables (Placeholders)

Templates support **dynamic variables** that are automatically replaced with actual data when sending notifications:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `{name}` | Client's name | "Ion Popescu" |
| `{plate}` | License plate number | "B123ABC" |
| `{date}` | Expiry date (formatted) | "20 Dec 2025" |
| `{station_name}` | Your station's name | "Auto Service Demo" |
| `{station_phone}` | Your phone number | "+40712345678" |
| `{station_address}` | Your address | "Str. Exemplu Nr. 123, București" |
| `{app_url}` | App website | "https://uitdeitp.ro" |
| `{opt_out_link}` | Unsubscribe link (GDPR) | "https://uitdeitp.ro/opt-out/xxx" |

### Usage Example

**Template:**
```
Bună {name}, ITP pentru {plate} expiră pe {date}.
Programează la {station_name}: {station_phone}
```

**Rendered Output:**
```
Bună Ion Popescu, ITP pentru B123ABC expiră pe 20 Dec 2025.
Programează la Auto Service Demo: +40712345678
```

---

## Template Types

### 1. SMS Templates

**Character Limits:**
- **1 SMS = 160 characters** (including spaces)
- Messages exceeding 160 chars are split into multiple SMS (costs multiply)
- Emojis count as 2-4 characters

**Best Practices:**
- Keep messages concise (under 160 chars for 1 SMS cost)
- Include essential info: expiry date, station phone, urgency
- Use abbreviations where appropriate (e.g., "ITP" not "Inspecție Tehnică Periodică")
- Avoid excessive emojis (they increase character count)

### 2. Email Templates

**Email templates have no character limit** and support:
- Multi-line formatting
- Rich text (bullets, bold, etc. via plain text conventions)
- Longer explanations and promotional content

**Best Practices:**
- Use clear subject lines (auto-generated from first line)
- Include all relevant information (date, penalties, benefits)
- Add call-to-action (phone number, address)
- Keep paragraphs short for mobile readability

---

## Notification Intervals

Notifications are sent at **three intervals** before ITP expiry:

### 1. **5 Days Before** (Informational)
- **Purpose**: Early warning, gentle reminder
- **Tone**: Friendly, informative
- **Recommended length**: 1 SMS (160 chars) or 150-200 words email
- **Example focus**: "Schedule appointment to avoid last-minute rush"

### 2. **3 Days Before** (Urgent)
- **Purpose**: Emphasize urgency, motivate action
- **Tone**: More urgent, highlight consequences
- **Recommended length**: 1-2 SMS or 200-300 words email
- **Example focus**: "Only 3 days left! Avoid fines up to 1,450 RON"

### 3. **1 Day Before** (Critical)
- **Purpose**: Final alert, immediate action required
- **Tone**: Very urgent, direct call-to-action
- **Recommended length**: 1-2 SMS or 250-350 words email
- **Example focus**: "ITP expires TOMORROW! Call now to schedule emergency inspection"

---

## SMS Template Examples

### Example 1: Minimalist (1 SMS)
```
ITP {plate} expiră {date}. Programează: {station_phone}. Opt-out: {opt_out_link}
```
*Character count: ~80 chars (fits in 1 SMS)*

### Example 2: Friendly (1-2 SMS)
```
Bună {name}! ITP {plate} expiră pe {date}. Programează la {station_name} ({station_phone}) pentru o inspecție rapidă! Dezabonare: {opt_out_link}
```
*Character count: ~150 chars (1 SMS)*

### Example 3: Detailed (2-3 SMS)
```
ATENȚIE {name}: ITP {plate} expiră pe {date} - doar 3 zile! Evită amenzi până la 1.450 RON. Sună acum {station_phone} sau vizitează {station_address}. {station_name} - suntem aici pentru tine! Dezabonare: {opt_out_link}
```
*Character count: ~230 chars (2 SMS)*

---

## Email Template Examples

### Example: Professional & Detailed

**Subject Line (auto-generated from template):**
```
ATENȚIE: ITP {plate} expiră în 3 zile
```

**Email Body:**
```
Bună {name},

ITP pentru vehiculul {plate} expiră pe {date} - mai sunt doar 3 zile!

📅 PROGRAMEAZĂ URGENT pentru a evita:
❌ Amendă de până la 1.450 RON
❌ Suspendarea certificatului de înmatriculare
❌ Imposibilitatea circulației legale

📞 Suntem aici pentru tine:
Telefon: {station_phone}
Adresă: {station_address}

{station_name} oferă:
✅ Inspecție tehnică completă în max 30 minute
✅ Programări flexibile (inclusiv weekend)
✅ Prețuri competitive și transparente

Programează acum pentru a circula legal și în siguranță!

Cu respect,
Echipa {station_name}

---
Acest reminder a fost creat la {station_name} prin platforma uitdeITP.
Dezabonare: {opt_out_link}
```

---

## GDPR Compliance Requirements

**All templates MUST include:**

1. **Opt-out link**: `{opt_out_link}` variable (mandatory)
2. **Station identification**: Mention `{station_name}` so clients know who sent the message
3. **Clear purpose**: Clearly state this is an ITP expiry reminder

**Example Compliant Footer:**
```
Acest reminder a fost creat la {station_name}.
Dezabonare: {opt_out_link}
```

**What NOT to do:**
- ❌ Remove opt-out link (violates GDPR)
- ❌ Hide station name (lack of transparency)
- ❌ Use misleading subject lines (e.g., "Câștigător concurs!")

---

## Template Validation Rules

The system enforces these rules:

- **Minimum length**: 10 characters (prevents empty templates)
- **Required variables**: Must include `{plate}` and `{date}` (core information)
- **Opt-out link**: `{opt_out_link}` must be present in all templates
- **Character encoding**: UTF-8 (Romanian diacritics supported: ă, â, î, ș, ț)

**Validation errors you might see:**
- "Template-ul trebuie să aibă minim 10 caractere"
- "Template-ul trebuie să includă variabila {plate}"
- "Template-ul trebuie să includă link-ul de dezabonare {opt_out_link}"

---

## Testing Your Templates

### Preview Feature

The admin panel includes a **live preview** that shows how your template will look with sample data.

**Steps to test:**
1. Edit your template in the text area
2. Click "Arată Preview" button
3. Review the rendered output with sample data
4. Adjust template as needed
5. Click "Salvează Template-uri" when satisfied

**Sample Preview Data:**
- Name: Ion Popescu
- Plate: B123ABC
- Date: 20 Dec 2025
- Station Phone: +40712345678
- Station Address: Str. Exemplu Nr. 123, București

### Test Reminder (Coming Soon)

**Planned feature:** Send test SMS/email to your own number/email to verify formatting.

---

## Cost Optimization Tips

### SMS Cost Savings

**Current SMS pricing**: ~€0.04 per SMS (Romania)

**Optimization strategies:**
1. **Keep templates under 160 characters** to send as 1 SMS instead of 2-3
2. **Use abbreviations**: "ITP" instead of "Inspecție Tehnică Periodică"
3. **Shorten URLs**: Use `{app_url}` instead of full domain
4. **Avoid emojis in 5-day reminder** (save for urgent 1-day reminder)
5. **Remove filler words**: "și", "de asemenea", "vă rugăm să"

**Example optimization:**

❌ **Before (185 chars = 2 SMS = €0.08):**
```
Bună ziua {name}, vă informăm că Inspecția Tehnică Periodică pentru vehiculul cu numărul de înmatriculare {plate} va expira pe data de {date}. Vă rugăm să ne contactați la numărul de telefon {station_phone}. Mulțumim!
```

✅ **After (140 chars = 1 SMS = €0.04):**
```
ITP {plate} expiră {date}. Programează: {station_phone}. {station_name} - inspecții rapide! Opt-out: {opt_out_link}
```

**Savings**: €0.04 per reminder × 100 reminders/month = **€4/month saved**

---

## Common Use Cases

### Use Case 1: High-Volume Station (300+ reminders/month)
**Goal**: Minimize SMS costs while maintaining professional image

**Strategy:**
- 5-day reminder: Email only (no SMS)
- 3-day reminder: 1 SMS (under 160 chars)
- 1-day reminder: 1 SMS + detailed email

**Savings**: ~€40/month on SMS costs

### Use Case 2: Premium Service Station
**Goal**: Maximize client satisfaction with personalized messaging

**Strategy:**
- 5-day reminder: Friendly email with promotional content
- 3-day reminder: 2 SMS with urgent tone + detailed email
- 1-day reminder: 2 SMS with URGENT prefix + email with contact options

**Focus**: Client retention over cost savings

### Use Case 3: Rural Station (Limited Internet Access)
**Goal**: Ensure all clients receive reminders (prefer SMS)

**Strategy:**
- All reminders: SMS-first approach
- Keep SMS templates concise (1 SMS per reminder)
- Include phone number prominently for direct contact

---

## Troubleshooting

### Issue: Template Not Saving

**Possible causes:**
1. Template too short (minimum 10 characters)
2. Missing required variables (`{plate}`, `{date}`, `{opt_out_link}`)
3. Invalid special characters (use UTF-8 safe chars)

**Solution:** Check validation error message in red alert box

### Issue: Variables Not Rendering

**Symptom:** Clients receive messages with "{name}" instead of actual name

**Cause:** Typo in variable name (e.g., `{nume}` instead of `{name}`)

**Solution:** Copy-paste variables from the guide above to avoid typos

### Issue: SMS Split Into Multiple Messages

**Cause:** Template exceeds 160 characters

**Solution:**
1. Count characters in template editor (shown below text area)
2. Remove unnecessary words, use abbreviations
3. Test preview to verify character count

---

## Advanced Tips

### Multi-Language Support (Coming Soon)

**Planned feature:** Detect client language preference and use appropriate template.

**Current workaround:** Use Romanian templates (majority of users) or create separate stations for different languages.

### Dynamic Content Based on Reminder Type

**Use case:** Different messaging for ITP vs. RCA vs. Rovinieta

**Current limitation:** Templates apply to all reminder types

**Workaround:** Use generic wording:
```
{reminder_type} pentru {plate} expiră pe {date}
```
*(Note: `{reminder_type}` variable coming in future update)*

---

## Support

### Need Help?

**Contact Options:**
- Email: contact@uitdeitp.ro
- Phone: +40 XXX XXX XXX
- Admin Panel: Live chat (bottom-right corner)

**Common Questions:**
- How to restore default templates?
- How to A/B test different messaging?
- How to schedule custom notification intervals?

See **FAQ section** in admin panel or contact support.

---

## Changelog

### Version 2.0 (November 2025)
- ✅ Added email template customization
- ✅ Added SMS template customization
- ✅ Added live preview feature
- ✅ Added character count for SMS optimization

### Planned Features
- Send test notifications to your own phone/email
- A/B testing for templates
- Analytics: open rates, click rates, conversion rates
- Multi-language template support
- Custom notification intervals (beyond 5/3/1 days)

---

**Last Updated**: November 16, 2025
**Guide Version**: 1.0
**Platform Version**: 2.0
