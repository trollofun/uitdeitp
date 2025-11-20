# PWA Icon Generation Instructions

## Required Icons

### Android Icons (Chrome, Edge, Samsung Internet)
- **icon-192x192.png** - Standard app icon (192x192px)
- **icon-512x512.png** - High-res icon for splash screen (512x512px)

### iOS Icons (Safari)
- **apple-touch-icon.png** - iOS home screen icon (180x180px)

### Favicon
- **favicon.ico** - Browser tab icon (32x32px)

## Design Guidelines

### Visual Design
- **Background**: White or brand primary color (#3B82F6)
- **Logo**: uitdeITP logo centered
- **Padding**: 20% safe area around logo (avoid clipping on rounded corners)
- **Style**: Modern, clean, professional
- **Colors**: Match station branding when possible

### Maskable Icons
Android icons should be "maskable" (adaptive icons):
- Use full 512x512px canvas
- Keep critical content in 80% safe zone (centered 410x410px area)
- Background should extend to edges (no transparency)
- Foreground logo in center

### iOS Specific
- No transparency (Safari adds rounded corners)
- No text (too small to read at 180px)
- High contrast for visibility on any home screen

## Generation Tools

### Online Tools (Recommended for Quick Generation)
1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
   - Upload 512x512 source image
   - Downloads all required sizes automatically

2. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Comprehensive favicon and touch icon generator
   - Previews on multiple devices

### CLI Tools (For Automation)
```bash
# Using ImageMagick (install: sudo apt-get install imagemagick)
# Generate from SVG source
convert logo.svg -resize 192x192 icon-192x192.png
convert logo.svg -resize 512x512 icon-512x512.png
convert logo.svg -resize 180x180 apple-touch-icon.png

# Or from PNG source
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 512x512 icon-512x512.png
convert logo.png -resize 180x180 apple-touch-icon.png
```

### Design Tools
- **Figma Template**: Create 512x512 artboard with safe zones
- **Adobe Illustrator**: Export at different sizes
- **Sketch**: Use "Export for Web" with multiple resolutions

## Placeholder Icons (Temporary)

For development/testing, you can create simple placeholder icons:

```bash
# Create blue square placeholder icons
convert -size 192x192 xc:#3B82F6 \
  -gravity center -pointsize 80 -fill white -annotate +0+0 "ITP" \
  icon-192x192.png

convert -size 512x512 xc:#3B82F6 \
  -gravity center -pointsize 200 -fill white -annotate +0+0 "ITP" \
  icon-512x512.png

convert -size 180x180 xc:#3B82F6 \
  -gravity center -pointsize 72 -fill white -annotate +0+0 "ITP" \
  apple-touch-icon.png
```

## Testing

### Android Testing
1. Open Chrome DevTools → Application → Manifest
2. Check "Installable" section for errors
3. Test install prompt on Android device
4. Verify icon appears correctly on home screen

### iOS Testing
1. Open Safari on iPad/iPhone
2. Tap Share → Add to Home Screen
3. Verify icon and name appear correctly
4. Launch app to test fullscreen mode

### Lighthouse PWA Audit
```bash
# Run Lighthouse audit
npm run lighthouse -- --url=https://uitdeitp.ro/kiosk/station-slug

# Check PWA category score (target: 90+)
# - Installable: YES
# - Configured for custom splash screen: YES
# - Themed omnibox: YES
```

## Current Status

⚠️ **PLACEHOLDER ICONS NEEDED**

The icons in this directory are placeholders. For production:
1. Get uitdeITP logo in SVG or high-res PNG (min 1024x1024)
2. Use PWA Asset Generator to create all sizes
3. Replace placeholders with branded icons
4. Test on Android and iOS devices

## File Checklist

- [ ] icon-192x192.png (192x192, maskable)
- [ ] icon-512x512.png (512x512, maskable)
- [ ] apple-touch-icon.png (180x180, opaque)
- [ ] favicon.ico (32x32, for browsers)
