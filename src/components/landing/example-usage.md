# Landing Page Components - Usage Examples

## HeroSection

The HeroSection component follows Gestalt Pragnanz principles with a single focal point and symmetric layout.

### Basic Usage

```tsx
import { HeroSection } from '@/components/landing';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      {/* Other sections */}
    </div>
  );
}
```

### With Custom Styling

```tsx
<HeroSection className="bg-gradient-to-r from-blue-50 to-indigo-50" />
```

### Gestalt Principles Applied

- **Pragnanz**: Single focal point (headline "Nu mai uita de ITP")
- **Symmetry**: Centered layout creates visual balance
- **Figure/Ground**: Strong contrast between content and background
- **Proximity**: CTAs grouped closely together

### Accessibility Features

- Semantic HTML with `<section>` and heading hierarchy
- ARIA labels for screen readers
- Keyboard navigation support
- Smooth scroll behavior for secondary CTA

---

## FeaturesGrid

The FeaturesGrid displays 3 identical feature cards following Gestalt Similarity principles.

### Basic Usage

```tsx
import { FeaturesGrid } from '@/components/landing';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <FeaturesGrid />
      {/* Other sections */}
    </div>
  );
}
```

### With ID for Anchor Links

The component includes `id="how-it-works"` by default for smooth scrolling from the HeroSection.

```tsx
// HeroSection's "Vezi cum funcționează" button will scroll to this
<FeaturesGrid />
```

### Gestalt Principles Applied

- **Similarity**: All cards IDENTICAL in structure, size, and styling
- **Proximity**: Cards grouped together showing relationship
- **Symmetry**: Equal spacing and alignment in grid
- **Figure/Ground**: Cards elevated with shadows

### Card Structure

Each feature card includes:
- Centered icon (48px, monochrome, primary color)
- Title (20px, bold, max 1 line)
- Description (16px, max 2 lines, centered)
- Same height (280px minimum)
- Consistent hover effects

### Responsive Behavior

- **Mobile**: 1 column, stacked vertically
- **Tablet**: 2 columns
- **Desktop**: 3 columns

---

## Complete Landing Page Example

```tsx
import { HeroSection, FeaturesGrid } from '@/components/landing';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero with primary CTA */}
      <HeroSection />
      
      {/* Features explanation */}
      <FeaturesGrid />
      
      {/* Additional sections can follow */}
    </main>
  );
}
```

---

## Design Tokens Used

Both components use Tailwind CSS design tokens:

- **Spacing**: Consistent 24px/48px gaps
- **Colors**: `primary`, `accent`, `muted`, `foreground`, `background`
- **Typography**: System font stack with proper hierarchy
- **Border Radius**: `rounded-xl` for cards, `rounded-3xl` for hero image
- **Shadows**: `shadow-lg`, `shadow-xl`, `shadow-2xl`

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for all screen sizes
- Accessibility standards (WCAG 2.1 AA)
- Progressive enhancement approach

---

## Performance Considerations

- **Code Splitting**: Each component lazy-loadable
- **Optimized Rendering**: Pure functional components
- **Minimal Dependencies**: Only uses `lucide-react` icons
- **No External Resources**: All styles inline via Tailwind

---

## Customization

To customize feature content, edit `/src/components/landing/FeaturesGrid.tsx`:

```tsx
const features: Feature[] = [
  {
    icon: Mail,
    title: 'Your Custom Title',
    description: 'Your custom description here',
    ariaLabel: 'Accessible description'
  },
  // Add more features...
];
```

To customize hero content, edit `/src/components/landing/HeroSection.tsx`:

```tsx
<h1>Your Custom Headline</h1>
<p>Your custom subheadline</p>
```
