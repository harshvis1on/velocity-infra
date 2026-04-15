# Host Page Redesign — "Compute as an Asset Class"

## Overview

Redesign the `/host` page as an institutional-grade investment pitch for GPU hosting. Update the landing page's provider teaser section to be a compact hook linking to `/host`. Convert all public-facing prices from INR to USD. Fix Vercel page load performance.

## Decisions Made

- **Tone**: Institutional investor — "yield," "ROI," "break-even," "asset class"
- **Currency**: USD on all public pages. Console/billing stays INR for Indian users.
- **Landing page**: Condensed teaser card linking to `/host` (replaces current provider section)
- **Typography**: Instrument Serif (headlines only) + Outfit (everything else). No monospace.
- **Layout**: Asymmetric split hero, horizontal scroll yield cards, editorial zigzag thesis, numbered step list, horizontal tier progression bar
- **No emojis**: Tier badges are clean text
- **Images**: AI-generated via image generation tool (5 images needed)

## Page Structure — `/host`

### Section 1: Hero (split-screen)
- Left: overline "FOR PROVIDERS & INVESTORS", headline "Own the infrastructure of the AI era" (serif, italic green on "AI era"), body copy, 3 stats (300% Annual ROI, 4mo break-even, $2.1B market demand), CTA "Start Generating Yield"
- Right: AI-generated hero image — abstract GPU chip as monumental architecture, dark cinematic lighting

### Section 2: Yield Table (horizontal scroll track)
- Left-aligned header: "Your hardware, generating yield"
- Horizontally scrollable cards: RTX 4090, A100 80GB, H100 SXM5, L40S 48GB, A6000 48GB
- Each card: GPU image (AI-generated), GPU name, hardware cost, hourly rate, monthly projected yield, break-even timeline, annual ROI %

### Section 3: Macro Thesis (editorial zigzag)
- Row 1 (text left, image right): "The scarcest resource in technology." + data chips (10x demand, $500B spend) + AI-generated demand curve visualization
- Row 2 (image left, text right): "85% of GPUs sit idle right now." + data chips (85% idle, 2x budgets) + AI-generated server rack image

### Section 4: How It Works (numbered list)
- Three steps, each as a grid row: number | text | code snippet
- 01 Install → 02 Price (auto-pricing or custom) → 03 Earn

### Section 5: Tier Progression (horizontal bar)
- "Compound your returns" — reframed from fee table to return multiplier
- Bronze 15% → Silver 12% → Gold 10% → Platinum 7% → Diamond 5%
- Animated fill sweep on scroll

### Section 6: Final CTA
- "Every idle hour is yield forgone."
- CTA: Start Generating Yield

## Landing Page Changes

### Provider teaser (replaces lines 284–336 in page.tsx)
- Compact section: overline "THE NEW ASSET CLASS", headline "Compute generates yield.", 3 GPU yield cards (RTX 4090, A100, H100), link to /host

### Price table update (lines 8–14)
- Convert all prices from ₹ to $

### Use cases update (lines 16–21)
- Convert costs from ₹ to $

## AI Images Needed (5)

1. **Hero image**: Abstract GPU chip as monumental architecture — silicon cathedral rising from circuit-board terrain, dark cinematic editorial lighting, green accent highlights
2. **Thesis image 1**: Stylized exponential demand curve, editorial data visualization aesthetic, dark background
3. **Thesis image 2**: Server rack rows with one glowing green — the "activated" GPU
4. **GPU card renders**: Product-shot style GPU cards (one composite or individual), dramatic dark lighting

## Performance Fixes

1. Replace `framer-motion` animations on landing pages with CSS animations + Intersection Observer (~40KB bundle reduction)
2. Use `next/image` with `priority` for above-fold, `loading="lazy"` for below
3. Font subsetting — load only Instrument Serif 400/italic + Outfit 300,400,500,600,700,800
4. Dynamic import for heavy components (`HeroTerminal`)
5. Use `min-h-[100dvh]` instead of `min-h-screen`

## Animation Spec

- Hero: stagger-reveal text left (0.2s delay between elements), image fade-in + subtle parallax right
- Stats: countUp from 0 on scroll intersection
- Yield cards: staggered entrance with spring physics on hover
- Thesis visuals: parallax offset (0.8x scroll speed)
- Steps: sequential reveal on scroll
- Tier bar: animated green fill sweep left-to-right on scroll
- All easing: `cubic-bezier(0.16, 1, 0.3, 1)` — no linear

## Files Changed

- `web/src/app/host/page.tsx` — full rewrite
- `web/src/app/page.tsx` — update provider section + convert ₹ to $
- New: `web/src/app/host/HeroImage.tsx` (lazy-loaded)
- New: `web/src/app/host/YieldCards.tsx` (client component, horizontal scroll)
- New: `web/src/app/host/ThesisSection.tsx` (parallax)
- New: `web/src/app/host/TierBar.tsx` (animated)
- New: `public/images/host/` — AI-generated images
- `web/src/app/components/HeroTerminal.tsx` — dynamic import wrapper
