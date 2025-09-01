# ACT Platform CSS Architecture - Unified System

## Overview
This document describes the permanent, robust CSS loading system for the ACT Platform that combines:
- **Tailwind CSS** (utility-first framework)
- **ITCSS Architecture** (Inverted Triangle CSS methodology)
- **Vite CSS processing** (build-time optimization)

## CSS Loading Chain

```
index.html
    └── src/main.tsx
        └── src/index.css ← ENTRY POINT
            ├── @import "tailwindcss"
            └── @import "./styles/main.css" ← COMPLETE ITCSS SYSTEM
                ├── 01-settings/ (Variables, tokens, themes)
                ├── 02-tools/ (Mixins, functions)
                ├── 03-generic/ (Reset, normalize)
                ├── 04-elements/ (Base HTML styling)
                ├── 05-objects/ (Undecorated patterns)
                ├── 06-components/ (UI components)
                └── 07-utilities/ (Helper classes)
```

## File Structure

```
src/
├── index.css                    ← MAIN ENTRY POINT
├── styles/
│   ├── main.css                 ← ITCSS CASCADE CONTROLLER
│   ├── 01-settings/
│   │   ├── tokens.css           ← Design tokens
│   │   └── themes.css           ← Theme definitions
│   ├── 02-tools/
│   │   ├── mixins.css           ← Sass-like mixins
│   │   └── functions.css        ← CSS functions
│   ├── 03-generic/
│   │   ├── reset.css            ← CSS reset
│   │   └── normalize.css        ← Normalize styles
│   ├── 04-elements/
│   │   ├── typography.css       ← Base typography
│   │   ├── forms.css            ← Form elements
│   │   └── media.css            ← Images, video
│   ├── 05-objects/
│   │   ├── layout.css           ← Layout patterns
│   │   ├── grid.css             ← Grid systems
│   │   └── stack.css            ← Stack layouts
│   ├── 06-components/
│   │   ├── button.css           ← Button components
│   │   ├── card.css             ← Card components
│   │   ├── input.css            ← Input components
│   │   ├── navigation.css       ← Navigation
│   │   ├── landing.css          ← Landing page
│   │   ├── public.css           ← Public app styles
│   │   ├── internal.css         ← Internal app styles
│   │   └── legacy.css           ← Legacy components
│   └── 07-utilities/
│       ├── spacing.css          ← Margin, padding utils
│       ├── typography.css       ← Typography utils
│       ├── layout.css           ← Layout utils
│       └── themes.css           ← Theme switching utils
```

## Key Principles

### 1. Single Entry Point
- **ALL** CSS loads through `src/index.css`
- **NO** direct imports in components
- **NO** CSS files in `public/` directory
- **NO** emergency workarounds

### 2. Proper Cascade Order
```css
/* Correct order in index.css */
@import "tailwindcss";           /* 1. Tailwind base */
@import "./styles/main.css";     /* 2. Complete ITCSS cascade */
/* 3. Custom extensions below */
```

### 3. ITCSS Layers (Specificity ↑)
1. **Settings** - Variables, no output
2. **Tools** - Mixins, functions, no output  
3. **Generic** - Reset, normalize
4. **Elements** - HTML elements (h1, p, a)
5. **Objects** - Layout patterns (.o-grid)
6. **Components** - UI components (.c-button)
7. **Utilities** - Helper classes (.u-text-center)

### 4. Tailwind Integration
- Tailwind loads **first** to provide base styles
- ITCSS layers can use `@apply` for Tailwind utilities
- Custom components extend Tailwind with component-specific styles

## Development Rules

### ✅ DO
- Import CSS only in `src/index.css`
- Use the complete ITCSS system via `main.css`
- Add custom styles as extensions in `index.css`
- Use Tailwind utilities with `@apply` in component CSS
- Follow ITCSS naming conventions (`.c-`, `.o-`, `.u-`)

### ❌ DON'T
- Import CSS files directly in React components
- Add `<link>` tags to `index.html` (except fonts)
- Create "emergency" CSS files in `public/`
- Skip the ITCSS cascade by importing individual files
- Mix CSS methodologies without following the architecture

## Vite Configuration

The system works with this Vite setup:

```js
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: false,  // Prevents sourcemap issues
  },
  // ... rest of config
})
```

```js
// postcss.config.js  
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

## Testing CSS Loading

### Development Test
```bash
npm run dev
# Check browser console for CSS errors
# Verify all styles are loading
```

### Build Test
```bash
npm run build
# Should complete without CSS errors
# Check dist/ for processed CSS
```

### CSS Import Test
```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('./src/index.css', 'utf8');
console.log('CSS loads:', css.includes('@import'));
"
```

## Troubleshooting

### Issue: Styles not loading
**Solution**: Ensure `src/index.css` imports `./styles/main.css`

### Issue: Build fails with CSS errors  
**Solution**: Check all `@import` paths are correct relative to the importing file

### Issue: Tailwind classes not working
**Solution**: Verify `@import "tailwindcss"` is first in `index.css`

### Issue: Component styles missing
**Solution**: Ensure component CSS files are imported in `styles/main.css`

## Migration from Emergency CSS

If you have emergency CSS workarounds:

1. **Remove** `<link>` tags from `index.html`
2. **Remove** dynamic CSS loading in `main.tsx`
3. **Delete** files in `public/` with CSS
4. **Extract** styles to appropriate ITCSS layer
5. **Test** that all styles still work

## Performance Notes

- Vite automatically optimizes CSS imports
- Dead CSS elimination happens at build time
- CSS is split into chunks for optimal loading
- Source maps disabled in development for performance

This architecture ensures robust, maintainable CSS that works consistently across development and production environments.