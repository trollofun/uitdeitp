<objective>
Implement a robust IP-based geolocation system with dual API fallback for automatic location detection in user profiles. This is CRITICAL for scaling the application beyond Constanța (current single ITP station location) to serve users across all Romanian counties.

**End Goal:** Users' profiles automatically populate with their county/city based on IP geolocation, with manual override option. This enables targeted ITP station recommendations and SMS notifications for the correct geographic area.

**Why This Matters:** Currently, the app should assume all users are in Constanța (where Euro Auto Service ITP station operates). To scale nationally and add more ITP stations, we need accurate user location data to:
- Recommend nearby ITP stations
- Send location-specific notifications
- Support multi-station white-label deployments across Romania
</objective>

<context>
**Current State:**
- Manual location dropdown with 42 Romanian counties (just implemented)
- LocationPicker component uses ipapi.co for auto-detection (registration flow only)
- Profile settings have manual location selector but NO auto-detection
- Single hardcoded fallback: București, România

**Tech Stack:**
- Next.js 14 (App Router)
- React 18
- Supabase (user profiles stored in database)
- Current geolocation: ipapi.co (free tier, 1000 requests/day limit)

**API Keys Provided:**
```
IPGEO_KEY = 4d76345f075d48e7872534cfe201802d
IPINFO_TOKEN = fe5f8aaf3f9aff
```

**Files to Examine:**
@src/components/auth/LocationPicker.tsx (current implementation with ipapi.co)
@src/components/dashboard/settings/ProfileTab.tsx (manual location selector)
@src/app/api/user/profile/route.ts (or similar - profile update endpoint)
@.env.example (to add new API keys)
</context>

<research>
**Phase 1: Research Latest Non-Deprecated APIs**

Before implementing, thoroughly research the following IP geolocation services to determine the best approach:

1. **IPGeoLocation API** (https://ipgeolocation.io)
   - Documentation: https://ipgeolocation.io/documentation.html
   - Key: `IPGEO_KEY = 4d76345f075d48e7872534cfe201802d`
   - Research: Latest API version, endpoints, response format, rate limits, accuracy for Romania
   - Check: Does it support county-level detection for Romania?

2. **IPInfo API** (https://ipinfo.io)
   - Documentation: https://ipinfo.io/developers
   - Token: `IPINFO_TOKEN = fe5f8aaf3f9aff`
   - Research: Latest API version, endpoints, response format, rate limits, accuracy for Romania
   - Check: Does it support county-level detection for Romania?

3. **Current ipapi.co API**
   - Documentation: https://ipapi.co/api/
   - Research: Is it still recommended? Any deprecation notices? Rate limits?

**Research Deliverables:**
Create `./research/ip-geolocation-apis.md` with:
- Comparison table of all 3 APIs (accuracy, rate limits, pricing, Romania support)
- Recommended fallback order (primary → secondary → tertiary)
- Response format examples from each API
- Code examples using latest non-deprecated endpoints
- Romanian county mapping (if APIs return city names instead of county codes)

**Research Focus:**
- **NO deprecated code** - use only latest API versions (2024/2025)
- **Accuracy for Romania** - test if APIs correctly identify Romanian counties
- **Rate limit strategies** - how to handle 1000-5000 requests/day limits
- **Error handling patterns** - what to do when all APIs fail
</research>

<requirements>
**Functional Requirements:**

1. **Dual-Fallback Geolocation System:**
   - Primary API: IPGeoLocation (IPGEO_KEY)
   - Secondary API: IPInfo (IPINFO_TOKEN)
   - Tertiary Fallback: ipapi.co (no key required, keep current implementation)
   - Final Fallback: Manual selection (București as default suggestion)

2. **Auto-Detection Flow:**
   ```
   User loads profile → Check if location already set
   ├─ If location set: Show existing location (no API call)
   └─ If location NOT set:
      ├─ Try IPGeoLocation API
      ├─ If fails → Try IPInfo API
      ├─ If fails → Try ipapi.co
      └─ If all fail → Show manual selector with București default
   ```

3. **County-Level Accuracy:**
   - APIs should detect Romanian COUNTY (județ), not just city
   - If API returns city name, map it to corresponding county
   - Example: "Cluj-Napoca" → "Cluj" county

4. **Rate Limit Protection:**
   - Cache geolocation results in browser localStorage (7 days)
   - Cache results in Supabase user profile (permanent until user changes)
   - Only call APIs if: (a) no cache exists AND (b) location not set in profile

5. **Environment Variables:**
   - Add to `.env.local` and `.env.example`:
     ```
     NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
     NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
     ```
   - Keys must be `NEXT_PUBLIC_*` since they're used in browser-side components

6. **User Profile Integration:**
   - Update `user_profiles` table schema if needed (ensure `city` and `country` columns exist)
   - When location detected, automatically update user profile in database
   - User can always override with manual selection

**Why These Constraints Matter:**
- Dual-fallback ensures 99.9% uptime even if one service is down
- Rate limit protection prevents API quota exhaustion (critical for free tiers)
- County-level accuracy enables precise ITP station recommendations
- Caching reduces API calls from thousands/day to hundreds/day (cost savings)
</requirements>

<implementation>
**Step 1: Research & Documentation** (Use Claude Flow Swarm)
- Deploy a research swarm to analyze all 3 IP geolocation APIs
- Compare accuracy, pricing, rate limits, Romanian support
- Document findings in `./research/ip-geolocation-apis.md`

**Step 2: Create Geolocation Service** (`./src/lib/services/geolocation.ts`)
```typescript
/**
 * IP Geolocation Service with Dual-Fallback
 *
 * Fallback order:
 * 1. IPGeoLocation API (primary)
 * 2. IPInfo API (secondary)
 * 3. ipapi.co (tertiary, free)
 * 4. Manual selection (final fallback)
 */

interface LocationResult {
  city: string;
  county?: string; // Romanian județ
  country: string;
  countryCode: string;
  source: 'ipgeo' | 'ipinfo' | 'ipapi' | 'manual' | 'cache';
  cached?: boolean;
}

export async function detectUserLocation(): Promise<LocationResult> {
  // 1. Check localStorage cache (7 days)
  const cached = getCachedLocation();
  if (cached) return { ...cached, cached: true };

  // 2. Try IPGeoLocation API
  try {
    const result = await fetchIPGeoLocation();
    if (result) {
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('IPGeoLocation failed:', error);
  }

  // 3. Try IPInfo API
  try {
    const result = await fetchIPInfo();
    if (result) {
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('IPInfo failed:', error);
  }

  // 4. Try ipapi.co (current implementation)
  try {
    const result = await fetchIPApiCo();
    if (result) {
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('ipapi.co failed:', error);
  }

  // 5. Final fallback: București
  return {
    city: 'București',
    county: 'București',
    country: 'România',
    countryCode: 'RO',
    source: 'manual',
  };
}

async function fetchIPGeoLocation(): Promise<LocationResult | null> {
  const API_KEY = process.env.NEXT_PUBLIC_IPGEO_KEY;
  // TODO: Implement using latest IPGeoLocation API
  // Research: Find latest endpoint and response format
}

async function fetchIPInfo(): Promise<LocationResult | null> {
  const TOKEN = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
  // TODO: Implement using latest IPInfo API
  // Research: Find latest endpoint and response format
}

async function fetchIPApiCo(): Promise<LocationResult | null> {
  // Keep existing implementation from LocationPicker.tsx
}
```

**Step 3: Update LocationPicker Component**
- Replace single ipapi.co call with `detectUserLocation()` service
- Add visual indicator showing which API was used (for debugging)
- Keep manual override functionality

**Step 4: Update ProfileTab Component**
- Add auto-detection on first load (if location not set)
- Show "Detecting location..." spinner during API calls
- Display which API was used: "Location detected via IPGeoLocation"
- Keep manual selection option

**Step 5: Romanian County Mapping** (if needed)
Create `./src/lib/constants/romania-counties.ts`:
```typescript
/**
 * Map Romanian cities to their counties (județe)
 */
export const CITY_TO_COUNTY: Record<string, string> = {
  'Cluj-Napoca': 'Cluj',
  'Timișoara': 'Timiș',
  'Iași': 'Iași',
  // ... all major cities
};

export function getCityCounty(cityName: string): string | null {
  return CITY_TO_COUNTY[cityName] || null;
}
```

**Step 6: Environment Configuration**
- Add keys to `.env.local`:
  ```
  NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
  NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
  ```
- Update `.env.example` with placeholder values
- Document API key setup in CLAUDE.md

**Step 7: Testing & Verification**
- Test with VPN connections from different Romanian counties
- Verify fallback chain works when APIs fail
- Check rate limit protection (should use cache after first call)
- Verify location saves to user profile database
</implementation>

<claude_flow_swarm>
**Swarm Organization:**

Use the `mcp__claude-flow__swarm_init` and related tools to orchestrate this complex implementation:

1. **Research Agent** (researcher)
   - Task: Analyze IPGeoLocation, IPInfo, and ipapi.co APIs
   - Deliverable: `./research/ip-geolocation-apis.md`

2. **Backend Agent** (coder)
   - Task: Implement geolocation service (`./src/lib/services/geolocation.ts`)
   - Dependencies: Wait for research agent results

3. **Frontend Agent** (coder)
   - Task: Update LocationPicker and ProfileTab components
   - Dependencies: Wait for backend agent to complete service

4. **Testing Agent** (analyst)
   - Task: Verify fallback chain, rate limits, Romanian accuracy
   - Dependencies: Wait for frontend agent to complete

**Swarm Topology:** Hierarchical (research → backend → frontend → testing)

**Invoke with:**
```
Use mcp__claude-flow__swarm_init with topology: "hierarchical"
Use mcp__claude-flow__agent_spawn for each agent type
Use mcp__claude-flow__task_orchestrate to coordinate the workflow
```
</claude_flow_swarm>

<verification>
**Pre-Deployment Checks:**

1. **API Response Validation:**
   ```bash
   # Test IPGeoLocation API
   curl "https://api.ipgeolocation.io/ipgeo?apiKey=4d76345f075d48e7872534cfe201802d"

   # Test IPInfo API
   curl "https://ipinfo.io/json?token=fe5f8aaf3f9aff"

   # Test ipapi.co
   curl "https://ipapi.co/json/"
   ```

2. **Romanian County Detection:**
   - Test with Romanian IP addresses
   - Verify county-level accuracy (not just city)
   - Ensure București, Cluj, Timiș, Iași are correctly identified

3. **Fallback Chain:**
   - Simulate IPGeoLocation failure → should use IPInfo
   - Simulate both failures → should use ipapi.co
   - Simulate all failures → should show manual selector with București

4. **Rate Limit Protection:**
   - First load: API calls made
   - Second load (within 7 days): No API calls (cache used)
   - User profile: Location saved permanently

5. **Build Verification:**
   ```bash
   npm run build
   # Should complete with no errors
   ```

6. **Manual Testing:**
   - Create new user account → location auto-detected
   - Existing user without location → location auto-detected on profile load
   - User with location → no API calls (uses existing data)
   - Manual override → works correctly, saves to database
</verification>

<output>
**Files to Create:**
- `./src/lib/services/geolocation.ts` - Dual-fallback geolocation service
- `./src/lib/constants/romania-counties.ts` - City-to-county mapping (if needed)
- `./research/ip-geolocation-apis.md` - API comparison and recommendations

**Files to Modify:**
- `./src/components/auth/LocationPicker.tsx` - Use new geolocation service
- `./src/components/dashboard/settings/ProfileTab.tsx` - Add auto-detection
- `./.env.local` - Add IPGEO_KEY and IPINFO_TOKEN
- `./.env.example` - Add placeholder keys
- `./CLAUDE.md` - Document geolocation system

**Environment Variables:**
```bash
# Add to .env.local
NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
```
</output>

<success_criteria>
✅ IPGeoLocation API integrated with latest non-deprecated endpoint
✅ IPInfo API integrated with latest non-deprecated endpoint
✅ Fallback chain works: IPGeo → IPInfo → ipapi.co → manual
✅ Romanian county-level accuracy verified (București, Cluj, Timiș, Iași tested)
✅ Rate limit protection: localStorage cache (7 days) + database persistence
✅ User profile automatically populates with location on first load
✅ Manual override works and saves to database
✅ Build completes successfully with no TypeScript errors
✅ No deprecated API code used (all 2024/2025 latest versions)
✅ Documentation updated in CLAUDE.md
✅ Research document completed with API comparison
</success_criteria>
