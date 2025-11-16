# Geolocation Quick Reference Guide

**For developers working with the IP geolocation system**

---

## 🚀 Quick Start

### Import the service
```typescript
import { detectUserLocation } from '@/lib/services/geolocation';
```

### Detect location
```typescript
const location = await detectUserLocation();
console.log(location.county); // "Cluj"
console.log(location.city); // "Cluj-Napoca"
console.log(location.source); // "ipgeo" | "ipinfo" | "ipapi" | "cache" | "manual"
```

---

## 📋 API Reference

### `detectUserLocation()`

Automatically detect user location with fallback chain.

**Returns:** `Promise<LocationResult>`

**LocationResult Interface:**
```typescript
interface LocationResult {
  city: string;           // "Cluj-Napoca"
  county: string;         // "Cluj" (județ)
  country: string;        // "România"
  countryCode: string;    // "RO"
  stateCode?: string;     // "RO-CJ" (ISO 3166-2)
  source: 'ipgeo' | 'ipinfo' | 'ipapi' | 'manual' | 'cache';
  cached?: boolean;       // true if from cache
  detectedAt?: number;    // Unix timestamp
}
```

**Example:**
```typescript
const location = await detectUserLocation();

if (location.source === 'cache') {
  console.log('Location loaded from cache');
} else {
  console.log(`Location detected via ${location.source} API`);
}

// Save to user profile
await updateUserProfile({
  city: location.county,  // Use county (județ) for better granularity
  country: location.countryCode,
});
```

---

### `detectLocationForIP(ip: string)`

Detect location for a specific IP address (admin/testing use).

**Parameters:**
- `ip` (string): IPv4 or IPv6 address

**Returns:** `Promise<LocationResult>`

**Requires:** `NEXT_PUBLIC_IPGEO_KEY` configured

**Example:**
```typescript
// Test with Romanian IP
const location = await detectLocationForIP('92.114.38.139');
console.log(location.county); // "Iași"
console.log(location.stateCode); // "RO-IS"
```

---

### `clearLocationCache()`

Clear cached location from localStorage (useful for testing).

**Returns:** `void`

**Example:**
```typescript
// Force fresh API detection
clearLocationCache();
const location = await detectUserLocation(); // Will call API
```

---

### `isGeolocationAvailable()`

Check if geolocation APIs are configured.

**Returns:** `boolean`

**Example:**
```typescript
if (!isGeolocationAvailable()) {
  console.warn('Geolocation API keys not configured');
  // Show manual location selector
}
```

---

### `getGeolocationStatus()`

Get detailed geolocation status (for debugging).

**Returns:**
```typescript
{
  ipgeoConfigured: boolean;    // IPGEO_KEY available
  ipinfoConfigured: boolean;   // IPINFO_TOKEN available
  cacheAvailable: boolean;     // localStorage available
  cached: boolean;             // Location currently cached
}
```

**Example:**
```typescript
const status = getGeolocationStatus();
console.log('IPGeoLocation:', status.ipgeoConfigured ? '✓' : '✗');
console.log('IPInfo:', status.ipinfoConfigured ? '✓' : '✗');
console.log('Cache:', status.cached ? 'Available' : 'Empty');
```

---

## 🔄 Fallback Chain

**Automatic fallback order:**
1. **localStorage cache** (7 days) → Instant, no API call
2. **IPGeoLocation API** → Best accuracy (county + ISO code)
3. **IPInfo API** → Fast, reliable
4. **ipapi.co** → Free fallback
5. **Manual default** → București (final fallback)

**Each API has 2-second timeout.**

---

## 🗺️ Romanian County Mapping

### All 42 Counties Supported

| Code | County | Code | County |
|------|--------|------|--------|
| AB | Alba | AR | Arad |
| AG | Argeș | BC | Bacău |
| BH | Bihor | BN | Bistrița-Năsăud |
| BT | Botoșani | BR | Brăila |
| BV | Brașov | **B** | **București** |
| BZ | Buzău | CL | Călărași |
| CS | Caraș-Severin | CJ | Cluj |
| CT | Constanța | CV | Covasna |
| DB | Dâmbovița | DJ | Dolj |
| GL | Galați | GR | Giurgiu |
| GJ | Gorj | HR | Harghita |
| HD | Hunedoara | IL | Ialomița |
| IS | Iași | IF | Ilfov |
| MM | Maramureș | MH | Mehedinți |
| MS | Mureș | NT | Neamț |
| OT | Olt | PH | Prahova |
| SJ | Sălaj | SM | Satu Mare |
| SB | Sibiu | SV | Suceava |
| TR | Teleorman | TM | Timiș |
| TL | Tulcea | VL | Vâlcea |
| VS | Vaslui | VN | Vrancea |

---

## ⚙️ Configuration

### Environment Variables Required

```bash
# .env.local
NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
```

**Note:** `NEXT_PUBLIC_*` prefix required for browser-side usage.

---

## 🎯 Common Use Cases

### 1. Auto-detect on registration
```typescript
// In registration form
const [location, setLocation] = useState<LocationResult | null>(null);

useEffect(() => {
  detectUserLocation().then(setLocation);
}, []);

// Use in form submission
const handleSubmit = async () => {
  await createUser({
    ...formData,
    city: location?.county,
    country: location?.countryCode,
  });
};
```

### 2. Update existing user profile
```typescript
// In profile settings
const handleAutoDetect = async () => {
  setDetecting(true);
  const location = await detectUserLocation();

  await updateProfile({
    city: location.county,
    country: location.countryCode,
  });

  toast({
    title: 'Locație detectată',
    description: `${location.county}, România (via ${location.source})`,
  });

  setDetecting(false);
};
```

### 3. Show detection source (for debugging)
```typescript
const location = await detectUserLocation();

const sourceLabels = {
  ipgeo: 'IPGeoLocation API',
  ipinfo: 'IPInfo API',
  ipapi: 'ipapi.co',
  cache: 'Cache (7 days)',
  manual: 'Default (București)',
};

console.log(`Detected via: ${sourceLabels[location.source]}`);
```

### 4. Conditional detection (skip if already set)
```typescript
// Only detect if user doesn't have location
if (!user.city || !user.country) {
  const location = await detectUserLocation();
  await updateProfile({
    city: location.county,
    country: location.countryCode,
  });
}
```

---

## 🐛 Debugging

### Enable debug logs
```typescript
// Check service status
const status = getGeolocationStatus();
console.log('Geolocation Status:', status);

// Test detection with logs
const location = await detectUserLocation();
// Check browser console for:
// - "Location loaded from cache: Cluj"
// - "Location detected via IPGeoLocation: Iași"
// - "IPGeoLocation API failed, trying fallback..."
```

### Clear cache for testing
```typescript
// Force fresh API call
import { clearLocationCache } from '@/lib/services/geolocation';
clearLocationCache();

// Next detection will call API
const location = await detectUserLocation();
```

### Test specific IP
```typescript
// Test with known Romanian IP
const location = await detectLocationForIP('92.114.38.139');
console.log(location); // Should detect Iași county
```

---

## ⚠️ Error Handling

### Handle API failures gracefully
```typescript
try {
  const location = await detectUserLocation();

  if (location.source === 'manual') {
    // All APIs failed, using fallback
    toast({
      title: 'Atenție',
      description: 'Nu s-a putut detecta locația. Folosim București ca default.',
      variant: 'warning',
    });
  }
} catch (error) {
  console.error('Location detection failed:', error);
  // Show manual location picker
}
```

---

## 📊 Performance Tips

### 1. Cache is automatic
**Don't clear cache unnecessarily** - it's automatically managed:
- Expires after 7 days
- Cleared when user changes location manually
- Stored in localStorage (`uitdeitp_user_location`)

### 2. Check before detecting
```typescript
// Skip API call if location already in database
if (profile.city && profile.country) {
  // Use existing location
} else {
  // Detect location
  const location = await detectUserLocation();
}
```

### 3. Detect once per session
```typescript
// Store in component state to avoid repeated detections
const [location, setLocation] = useState<LocationResult | null>(null);
const [detected, setDetected] = useState(false);

useEffect(() => {
  if (!detected && !profile.city) {
    detectUserLocation().then((loc) => {
      setLocation(loc);
      setDetected(true);
    });
  }
}, [detected, profile.city]);
```

---

## 🔐 Security Notes

- ✅ API keys are safe in `NEXT_PUBLIC_*` variables (client-side usage is intended)
- ✅ Keys only allow geolocation queries (no write access)
- ✅ Rate limits prevent abuse (1k-50k requests/month)
- ❌ Never expose `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

---

## 📈 Rate Limits

| API | Free Tier Limit | Expected Usage | Buffer |
|-----|----------------|----------------|--------|
| IPGeoLocation | 30,000/month | ~1,500/month | 95% |
| IPInfo | 50,000/month | ~1,500/month | 97% |
| ipapi.co | 30,000/month | ~300/month | 99% |

**Monitoring:**
- IPGeoLocation: https://app.ipgeolocation.io/dashboard
- IPInfo: https://ipinfo.io/account/home

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Location not detected | Check browser console for API errors |
| Wrong county | VPN/proxy may affect IP, use manual override |
| API limit exceeded | Check dashboard, upgrade to paid tier if needed |
| Cache not working | Check localStorage enabled, verify key `uitdeitp_user_location` |
| Slow detection | Increase timeout or check network connectivity |

---

## 📚 Related Files

- **Service:** `/src/lib/services/geolocation.ts`
- **Research:** `/research/ip-geolocation-apis.md`
- **Components:**
  - `/src/components/auth/LocationPicker.tsx`
  - `/src/components/dashboard/settings/ProfileTab.tsx`
- **Docs:** `/docs/GEOLOCATION_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** 2025-11-16
**Status:** ✅ Production Ready
