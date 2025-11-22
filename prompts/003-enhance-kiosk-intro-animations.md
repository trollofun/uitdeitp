<objective>
Enhance the kiosk idle screen (intro step) with eye-catching, professional animations that create a "wow factor" for always-on iPad displays.

This matters because:
- iPad kiosk is always on, visible to customers 24/7
- First impression must be engaging and professional
- Needs to attract attention without being overwhelming
- Should reflect the quality and reliability of the uitdeITP service
- Idle screen is the entry point for all kiosk interactions

Use the backup version (`/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/backup`) as inspiration, particularly the emoji-based sliding carousel and gradient animations. Then go beyond to create something even more impressive.
</objective>

<context>
Current idle screen location:
@src/components/kiosk/KioskIdleState.tsx

Backup version reference (DO NOT copy verbatim, use as inspiration):
@/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/backup

The idle screen should:
- Be visually striking and modern
- Use emojis and icons effectively (like backup version)
- Have smooth, professional animations
- Work well on iPad in landscape orientation
- Be touch-friendly (large "Start" button)
- Reflect station branding (primary color)
- Loop animations for always-on display

Available animation libraries:
- Framer Motion (already in use, preferred)
- CSS animations (for performance)
- Lucide React icons (for icons)
</context>

<research>
**Phase 1: Analyze Current and Backup Implementations**
1. Read current KioskIdleState component:
   @src/components/kiosk/KioskIdleState.tsx

2. Analyze backup version animations:
   @/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/backup
   - Identify sliding carousel pattern
   - Note emoji usage and transitions
   - Examine gradient effects
   - Study timing and easing functions

3. Identify what made backup animations engaging:
   - Specific animation types (slide, fade, scale, rotate?)
   - Use of emojis for visual interest
   - Gradient backgrounds or effects
   - Stagger effects or sequential animations

**Phase 2: Design Enhanced Animation System**
Consider adding (go beyond basics):
1. **Hero Section**:
   - Animated logo or title with gradient text
   - Pulsing or floating effect
   - Particle effects or subtle background motion

2. **Feature Carousel/Showcase**:
   - Sliding cards with emoji icons
   - Auto-rotating benefits (ITP, RCA, Rovinieta reminders)
   - Smooth transitions with spring physics
   - Parallax or depth effects

3. **Call-to-Action**:
   - Animated "Începe" button with pulse/glow
   - Attention-grabbing without being annoying
   - Touch ripple effect on tap

4. **Background Ambiance**:
   - Subtle gradient shifts
   - Floating shapes or orbs
   - Breathe effect (gentle in/out pulsing)

5. **Interactive Elements**:
   - Micro-interactions on hover (if mouse present)
   - Touch feedback animations
   - Entrance animations when returning to idle

**Phase 3: Implementation Strategy**
Use Framer Motion features:
- `motion` components for smooth animations
- `variants` for complex animation sequences
- `stagger` for sequential child animations
- `whileHover` and `whileTap` for interactivity
- `animate` with infinite loop for continuous motion
- `transition` with spring physics for natural feel
</research>

<implementation>
**Step 1: Study the backup version**
Thoroughly analyze what animations were used and why they were effective.

**Step 2: Design the new idle screen**
Create a modern, engaging idle experience with:
- Animated hero section (main title/logo)
- Feature showcase (carousel or grid of benefits)
- Prominent CTA button with attention-grabbing animation
- Background ambiance (subtle, not distracting)

**Step 3: Implement using Framer Motion**
Example patterns to consider:

```typescript
// Infinite pulsing glow effect
<motion.div
  animate={{
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.3)',
      '0 0 60px rgba(59, 130, 246, 0.6)',
      '0 0 20px rgba(59, 130, 246, 0.3)',
    ],
  }}
  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
>
  {/* Content */}
</motion.div>

// Sliding carousel with stagger
<motion.div
  variants={{
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  }}
>
  {features.map((feature) => (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0 },
      }}
    />
  ))}
</motion.div>

// Floating animation
<motion.div
  animate={{
    y: [-10, 10, -10],
  }}
  transition={{
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut',
  }}
/>
```

**What to avoid and WHY:**
- Avoid excessive motion that causes eye fatigue (this runs 24/7 on always-on display)
- Avoid rapid flashing or jarring transitions (accessibility concern)
- Avoid too many simultaneous animations (performance and visual clarity)
- Avoid tiny text or elements (touch-friendly kiosk UI requirement)
- Avoid animations that don't loop well (creates jarring restart on infinite loop)
</implementation>

<output>
Update or rewrite:
`./src/components/kiosk/KioskIdleState.tsx`

The component should:
1. Accept `onStart` callback prop (already does)
2. Accept `primaryColor` prop for station branding
3. Include 3-5 animated sections (hero, features, CTA, background)
4. Use Framer Motion for all animations
5. Be fully responsive and touch-optimized
6. Have smooth entrance when component mounts
7. Loop animations continuously for always-on display

Consider creating supporting files if needed:
- `./src/components/kiosk/IdleFeatureCard.tsx` - Reusable animated card
- `./src/components/kiosk/AnimatedBackground.tsx` - Background effects
</output>

<inspiration>
Great examples to draw from:
- Apple product landing pages (clean, sophisticated animations)
- Stripe website (subtle, professional motion)
- Linear app (smooth, purposeful animations)
- Modern SaaS landing pages (hero sections with gradient effects)

Emoji usage ideas:
- 🚗 Car/vehicle
- ✅ Checkmark (reminders sent)
- 📱 Phone (SMS notifications)
- ⏰ Clock (timely reminders)
- 🎯 Target (never miss deadlines)
- 🔔 Bell (notifications)

Color palette:
- Use station's primaryColor for main accents
- Gradient from primary to lighter shade
- White/light backgrounds for clean look
- Subtle shadows for depth
</inspiration>

<verification>
Before declaring complete, test:
1. ✓ Component renders without errors
2. ✓ Animations loop smoothly (no jarring restarts)
3. ✓ Touch interaction works (button tap triggers onStart)
4. ✓ Station branding color is applied correctly
5. ✓ No performance issues (check FPS in dev tools)
6. ✓ Looks professional and engaging (subjective but important)
7. ✓ Animations are smooth on iPad (60fps target)
8. ✓ Component is ready for always-on display usage

Visual QA checklist:
- Clean, modern aesthetic
- Professional (not gimmicky)
- Eye-catching but not overwhelming
- Brand colors integrated tastefully
- Emojis enhance (don't clutter)
- Hierarchy is clear (title → features → CTA)
</verification>

<success_criteria>
- KioskIdleState component has significantly enhanced animations
- Uses Framer Motion for smooth, professional motion
- Includes emoji-based visual interest (inspired by backup)
- Goes BEYOND the backup version in polish and sophistication
- Works perfectly on always-on iPad display (smooth looping)
- Maintains touch-friendly UI with large interactive elements
- Respects station branding (primary color integration)
- Creates "wow factor" first impression for customers
- Code is clean, performant, and maintainable
</success_criteria>
