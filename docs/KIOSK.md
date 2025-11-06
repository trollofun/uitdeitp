# Kiosk Mode Documentation

## Overview

Touch-optimized kiosk interface for ITP stations that allows customers to self-register for ITP reminders without requiring authentication.

## Architecture

### Directory Structure

```
src/
├── app/kiosk/
│   ├── layout.tsx                    # Kiosk-specific layout (fullscreen)
│   └── [stationId]/
│       ├── page.tsx                  # Main kiosk form
│       ├── success/page.tsx          # Success page with auto-redirect
│       └── error/page.tsx            # Error page with retry
├── components/kiosk/
│   ├── KioskLayout.tsx               # Fullscreen layout components
│   ├── TouchKeyboard.tsx             # On-screen keyboard
│   ├── ProgressBar.tsx               # Multi-step indicator
│   ├── StationBranding.tsx           # Dynamic branding
│   ├── IdleTimeout.tsx               # Auto-reset component
│   └── index.tsx                     # Exports
└── types/kiosk.ts                    # TypeScript definitions
```

## Features

### 1. Touch-Optimized Interface

- **Minimum Touch Target**: 44x44px (iOS/Android guidelines)
- **Large Fonts**: Minimum 18px, up to 72px for headings
- **High Contrast**: WCAG AAA compliant color ratios
- **Visual Feedback**: Scale animations on tap (95% scale)

### 2. Multi-Step Form Flow

**Step 1: Welcome Screen**
- Station branding (logo, colors, tagline)
- Large "Începe" button
- Auto-displays station information

**Step 2: Plate Number Input**
- Touch keyboard with Romanian alphabet
- Auto-uppercase input
- Real-time validation
- Format: `XX-123-ABC` or `XX123ABC`

**Step 3: Contact Information (Optional)**
- Phone number field (optional)
- Email field (optional)
- Native input fields for better UX

**Step 4: Expiry Date**
- Touch-friendly date picker
- Minimum date: today
- Clear calendar interface

**Step 5: Confirmation**
- Review all entered data
- Edit buttons for each field
- Large submit button

### 3. Station Branding System

Each station can customize:
- **Logo**: Display station logo
- **Primary Color**: Buttons, highlights
- **Secondary Color**: Text, accents
- **Tagline**: Custom message

```typescript
interface StationBrandingData {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}
```

### 4. Idle Timeout Protection

- **Default Timeout**: 60 seconds of inactivity
- **Warning**: 10-second countdown with modal
- **Events Monitored**:
  - Mouse movement
  - Touch events
  - Keyboard input
  - Scrolling

```typescript
<IdleTimeout
  onTimeout={handleReset}
  timeoutMs={60000}
  warningMs={50000}
>
  {children}
</IdleTimeout>
```

### 5. Error Handling

- Network errors → Error page with retry
- Validation errors → Inline feedback
- Station not found → Error message
- Form submission failure → Retry option

## Components

### KioskLayout

Fullscreen container with optional branding.

```tsx
<KioskLayout stationBranding={station}>
  <KioskHeader stationName="Station Name" logo="/logo.png" />
  <KioskContent>
    {/* Content */}
  </KioskContent>
  <KioskFooter />
</KioskLayout>
```

### TouchKeyboard

On-screen keyboard for plate number input.

```tsx
<TouchKeyboard
  type="plate"
  onKeyPress={(key) => handleKeyPress(key)}
  onBackspace={() => handleBackspace()}
  onClear={() => handleClear()}
  onEnter={() => handleSubmit()}
/>
```

### ProgressBar

Visual step indicator.

```tsx
<ProgressBar
  steps={[
    { id: 'welcome', label: 'Bun venit' },
    { id: 'plate', label: 'Număr Auto' },
    // ...
  ]}
  currentStep={1}
/>
```

### StationBranding

Display station logo and colors.

```tsx
<StationBranding
  station={stationData}
  showTagline={true}
/>

<BrandedButton
  brandColor={station.primaryColor}
  onClick={handleClick}
>
  Continuă
</BrandedButton>
```

### IdleTimeout

Auto-reset on inactivity.

```tsx
<IdleTimeout
  onTimeout={() => router.push('/kiosk/station-1')}
  timeoutMs={60000}
  warningMs={50000}
>
  {children}
</IdleTimeout>
```

## API Integration

### Station Validation

```typescript
GET /api/kiosk/[stationId]

Response:
{
  id: "station-1",
  name: "ITP Premium",
  logo: "/logos/premium.png",
  primaryColor: "#2563eb",
  secondaryColor: "#6b7280",
  tagline: "Servicii ITP profesionale"
}
```

### Form Submission

```typescript
POST /api/kiosk/submit

Body:
{
  stationId: "station-1",
  plateNumber: "B-123-ABC",
  phoneNumber: "0712345678",
  email: "user@example.com",
  expiryDate: "2025-06-15"
}

Response:
{
  success: true,
  message: "Reminder înregistrat cu succes"
}
```

## Validation Rules

### Plate Number

Romanian plate format:
- 1-2 letters (county code)
- 2-3 digits
- 3 letters
- Optional dashes

**Valid Examples**:
- `B-123-ABC`
- `B123ABC`
- `BT-01-XYZ`

**Invalid Examples**:
- `123-ABC` (missing county)
- `B-12-AB` (too short)
- `B-1234-ABC` (too many digits)

### Phone Number (Optional)

- Romanian mobile format: `07xx xxx xxx`
- Allows spaces and dashes
- Validates length

### Email (Optional)

- Standard email validation
- Displayed with mail icon

### Expiry Date

- Must be today or future date
- Date picker restricted to valid range
- Format: `YYYY-MM-DD`

## Styling Guidelines

### Colors

```css
/* Primary Actions */
.primary-button {
  background: station.primaryColor || #2563eb;
  color: white;
}

/* Secondary Actions */
.secondary-button {
  background: #6b7280;
  color: white;
}

/* Success */
.success {
  background: #16a34a;
  color: white;
}

/* Error */
.error {
  background: #dc2626;
  color: white;
}
```

### Typography

```css
/* Headings */
h1 { font-size: 3rem; font-weight: 800; }
h2 { font-size: 2.5rem; font-weight: 700; }

/* Body */
p { font-size: 1.25rem; line-height: 1.75; }

/* Labels */
label { font-size: 1.5rem; font-weight: 600; }

/* Buttons */
button { font-size: 1.5rem; font-weight: 700; }
```

### Spacing

```css
/* Minimum touch target */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Card padding */
.card {
  padding: 3rem;
  border-radius: 1.5rem;
}

/* Section spacing */
.section {
  margin-bottom: 2rem;
}
```

## Accessibility

### WCAG Compliance

- **Color Contrast**: Minimum 7:1 for AAA
- **Touch Targets**: Minimum 44x44px
- **Font Size**: Minimum 18px body text
- **Focus Indicators**: 4px ring on focus
- **Screen Reader Support**: Semantic HTML

### Keyboard Navigation

- Tab through form fields
- Enter to submit
- Escape to cancel
- Arrow keys for date picker

## Performance

### Optimizations

- **Static Generation**: Station pages pre-rendered
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Route-based splitting
- **Lazy Loading**: Heavy components loaded on demand

### Bundle Size

```
KioskLayout:      ~2 KB
TouchKeyboard:    ~3 KB
ProgressBar:      ~1 KB
StationBranding:  ~1 KB
IdleTimeout:      ~2 KB

Total:            ~9 KB (gzipped)
```

## Testing

### Manual Testing Checklist

- [ ] Welcome screen displays station branding
- [ ] Touch keyboard inputs work correctly
- [ ] Plate validation shows errors
- [ ] Contact fields are optional
- [ ] Date picker enforces minimum date
- [ ] Confirmation shows all data
- [ ] Success page auto-redirects
- [ ] Error page has retry button
- [ ] Idle timeout resets session
- [ ] All buttons have 44x44px minimum size

### Test Data

```typescript
// Valid station
{
  stationId: "station-1",
  plateNumber: "B-123-ABC",
  phoneNumber: "0712345678",
  email: "test@example.com",
  expiryDate: "2025-12-31"
}

// Invalid plate
{
  plateNumber: "123-ABC" // Missing county code
}

// Missing required data
{
  plateNumber: "B-123-ABC"
  // Missing expiry date
}
```

## Deployment

### Environment Variables

```env
# Not required for kiosk mode (guest access)
# Station data fetched from API
```

### Production Checklist

- [ ] Station data API endpoint live
- [ ] Submit API endpoint configured
- [ ] Error tracking enabled
- [ ] Analytics tracking enabled
- [ ] Station logos uploaded
- [ ] Brand colors configured
- [ ] Idle timeout tested
- [ ] Touch events working on tablets

## Future Enhancements

### Phase 2 Features

1. **QR Code Support**
   - Scan plate number from registration
   - Pre-fill form data

2. **Multi-Language**
   - Romanian (default)
   - Hungarian
   - English

3. **Voice Input**
   - Speak plate number
   - Voice confirmation

4. **Signature Capture**
   - Digital signature pad
   - Terms acceptance

5. **Receipt Printing**
   - Print confirmation
   - QR code for tracking

6. **Analytics Dashboard**
   - Usage statistics per station
   - Completion rates
   - Average session time

## Support

### Common Issues

**Issue**: Touch keyboard not working
**Solution**: Ensure device supports touch events, check browser compatibility

**Issue**: Idle timeout too aggressive
**Solution**: Adjust `timeoutMs` in `IdleTimeout` component

**Issue**: Station branding not loading
**Solution**: Verify station data API response includes logo URL

**Issue**: Plate validation too strict
**Solution**: Update regex in `types/kiosk.ts` → `PLATE_PATTERNS`

## Contributing

### Adding New Validation Rules

```typescript
// src/types/kiosk.ts
export const PLATE_PATTERNS = {
  standard: /^[A-Z]{1,2}[-]?\d{2,3}[-]?[A-Z]{3}$/,
  // Add new pattern
  custom: /your-pattern-here/,
}
```

### Customizing Idle Timeout

```typescript
// Adjust in component
<IdleTimeout
  timeoutMs={120000}  // 2 minutes
  warningMs={110000}  // 1:50 warning
  onTimeout={handleReset}
>
```

### Adding New Steps

```typescript
// Update step types
type KioskStep = 'welcome' | 'plate' | 'contact' | 'expiry' | 'confirmation' | 'new-step';

// Add to progress bar
const steps = [
  // ...existing steps
  { id: 'new-step', label: 'New Step', description: 'Description' },
];
```

## License

Proprietary - uitdeITP.ro
