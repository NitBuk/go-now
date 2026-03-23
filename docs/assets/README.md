# Visual Assets - Shot List

Screenshots and images for the README and social preview. These need to be captured manually from the live site.

## How to Capture

1. Open [go-now.dev](https://go-now.dev) in Chrome
2. Open DevTools (Cmd+Option+I)
3. Toggle device toolbar (Cmd+Shift+M)
4. Select "iPhone 14 Pro" (393x852) or similar
5. Set device pixel ratio to 2x for retina quality
6. Use Cmd+Shift+P > "Capture screenshot" for full-viewport screenshots

## Shot List

### screenshot-hero.png
- **What:** Main score view showing the NowCard with a "Good" or "Perfect" score, mode selector visible (Swim or Run), reason chips showing, ambient background gradient
- **Viewport:** 393x852 (iPhone 14 Pro)
- **State:** Default view on page load, ideally with a score >= 70 for visual appeal
- **Used in:** README hero section (displayed at 280px width)

### screenshot-timeline.png
- **What:** Hourly carousel section showing score progression across multiple hours, with score dots and labels visible
- **Viewport:** 393x852 (iPhone 14 Pro)
- **State:** Scroll down to the hourly carousel section
- **Used in:** README hero section (displayed at 280px width)

### screenshot-detail.png (optional)
- **What:** Hour detail sheet open, showing all weather factors (temperature, waves, wind, UV, AQI)
- **Viewport:** 393x852 (iPhone 14 Pro)
- **State:** Tap any hour card to open the detail sheet
- **Used in:** Documentation, optional for README

### social-preview.png
- **What:** GitHub social preview image -- shown when the repo URL is shared on Twitter, Slack, Discord, etc.
- **Dimensions:** 1280x640 (GitHub's recommended size)
- **Content suggestion:** Dark background (#0f172a or similar), "Go Now" title in large text, subtitle "Outdoor Activity Scoring Engine", a simplified score card visual or the app logo, "go-now.dev" in smaller text
- **Used in:** GitHub repo settings > Social preview

## After Capturing

1. Save files as PNG in this directory (`docs/assets/`)
2. Compress with `pngquant` or similar to keep each file under 200KB
3. The README already references these filenames -- they'll render automatically once added

## Quick Compression

```bash
# If you have pngquant installed
pngquant --quality=65-80 docs/assets/*.png --ext .png --force
```
