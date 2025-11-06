# Kiosk Mode - Quick Start Guide

## 🚀 Getting Started

### 1. Access Kiosk Mode

Navigate to: `/kiosk/[stationId]`

Example: `http://localhost:3000/kiosk/station-1`

### 2. Required API Endpoints

Before using kiosk mode, ensure these endpoints exist:

```typescript
// Get station data
GET /api/kiosk/[stationId]
Response: {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

// Submit reminder
POST /api/kiosk/submit
Body: {
  stationId: string;
  plateNumber: string;
  phoneNumber?: string;
  email?: string;
  expiryDate: string;
}
Response: {
  success: boolean;
  message?: string;
}
```

## 📦 Import Components

```typescript
// Import all kiosk components
import {
  KioskLayout,
  KioskHeader,
  KioskContent,
  KioskFooter,
  TouchKeyboard,
  ProgressBar,
  StationBranding,
  BrandedButton,
  IdleTimeout,
  type StationBrandingData,
} from '@/components/kiosk';

// Import types
import {
  KioskSubmission,
  StationConfig,
  PLATE_PATTERNS,
  KIOSK_CONFIG,
} from '@/types/kiosk';
```

## 🎨 Use Components

### Basic Layout

```tsx
import { KioskLayout, KioskHeader, KioskContent } from '@/components/kiosk';

export default function Page() {
  return (
    <KioskLayout>
      <KioskHeader stationName="My Station" logo="/logo.png" />
      <KioskContent>
        {/* Your content */}
      </KioskContent>
    </KioskLayout>
  );
}
```

### Touch Keyboard

```tsx
import { TouchKeyboard } from '@/components/kiosk';

function PlateInput() {
  const [plate, setPlate] = useState('');

  return (
    <>
      <input value={plate} readOnly />
      <TouchKeyboard
        type="plate"
        onKeyPress={(key) => setPlate(prev => prev + key)}
        onBackspace={() => setPlate(prev => prev.slice(0, -1))}
        onClear={() => setPlate('')}
        onEnter={() => handleSubmit()}
      />
    </>
  );
}
```

### Progress Bar

```tsx
import { ProgressBar } from '@/components/kiosk';

function Form() {
  const steps = [
    { id: 'step1', label: 'Step 1', description: 'First' },
    { id: 'step2', label: 'Step 2', description: 'Second' },
  ];

  return <ProgressBar steps={steps} currentStep={0} />;
}
```

### Station Branding

```tsx
import { StationBranding, BrandedButton } from '@/components/kiosk';

function Welcome() {
  const station = {
    id: 'station-1',
    name: 'My Station',
    logo: '/logo.png',
    primaryColor: '#2563eb',
    tagline: 'Professional ITP Services',
  };

  return (
    <>
      <StationBranding station={station} showTagline />
      <BrandedButton brandColor={station.primaryColor} onClick={handleClick}>
        Start
      </BrandedButton>
    </>
  );
}
```

### Idle Timeout

```tsx
import { IdleTimeout } from '@/components/kiosk';

function App() {
  return (
    <IdleTimeout
      onTimeout={() => router.push('/kiosk/station-1')}
      timeoutMs={60000}
      warningMs={50000}
    >
      {/* Your app */}
    </IdleTimeout>
  );
}
```

## ✅ Validate Plate Numbers

```typescript
import { PLATE_PATTERNS } from '@/types/kiosk';

function validatePlate(plate: string): boolean {
  return PLATE_PATTERNS.standard.test(plate);
}

// Usage
const isValid = validatePlate('B-123-ABC'); // true
const isInvalid = validatePlate('123-ABC'); // false
```

## 🎨 Customize Colors

### Station-specific colors

```tsx
const station = {
  primaryColor: '#8b5cf6',    // Purple
  secondaryColor: '#64748b',  // Slate
};

<KioskLayout stationBranding={station}>
  <BrandedButton brandColor={station.primaryColor}>
    Click me
  </BrandedButton>
</KioskLayout>
```

## ⚙️ Configuration

### Adjust timeouts

```tsx
// Longer timeout (2 minutes)
<IdleTimeout
  timeoutMs={120000}
  warningMs={110000}
  onTimeout={handleReset}
>
  {children}
</IdleTimeout>
```

### Custom validation

```typescript
// Add custom plate pattern
const customPattern = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

function validateCustomPlate(plate: string): boolean {
  return customPattern.test(plate);
}
```

## 🧪 Test Data

### Valid station data

```json
{
  "id": "station-1",
  "name": "Test Station",
  "logo": "https://example.com/logo.png",
  "primaryColor": "#2563eb",
  "secondaryColor": "#6b7280",
  "tagline": "Test Tagline"
}
```

### Valid submission

```json
{
  "stationId": "station-1",
  "plateNumber": "B-123-ABC",
  "phoneNumber": "0712345678",
  "email": "test@example.com",
  "expiryDate": "2025-12-31"
}
```

## 🚨 Common Issues

### Issue: Touch keyboard not appearing
**Solution**: Ensure `type="plate"` or `type="numeric"` is set

### Issue: Idle timeout too fast
**Solution**: Increase `timeoutMs` prop value

### Issue: Colors not applying
**Solution**: Verify station data includes `primaryColor` and `secondaryColor`

### Issue: Validation not working
**Solution**: Check plate format matches regex pattern

## 📱 Testing on Tablet

### Chrome DevTools

1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select tablet device (iPad, Galaxy Tab)
4. Test touch interactions

### Real Device Testing

1. Deploy to staging
2. Access from tablet browser
3. Test all touch interactions
4. Verify 44px minimum touch targets

## 🔗 Useful Links

- Full Documentation: `/docs/KIOSK.md`
- Implementation Summary: `/docs/KIOSK_SUMMARY.md`
- Type Definitions: `/src/types/kiosk.ts`
- Components: `/src/components/kiosk/`

## 💡 Tips

1. **Always test on real devices** - Touch behavior differs from mouse
2. **Use large fonts** - Minimum 18px for readability
3. **Add loading states** - Async operations should show spinners
4. **Handle errors gracefully** - Always provide retry options
5. **Test idle timeout** - Ensure it works as expected
6. **Validate early** - Show validation errors immediately
7. **Keep it simple** - Large buttons, clear messaging

## 🎯 Next Steps

1. Implement API endpoints
2. Test on tablet device
3. Configure station branding
4. Deploy to production
5. Train station staff

---

**Need help?** Check `/docs/KIOSK.md` for detailed documentation.
