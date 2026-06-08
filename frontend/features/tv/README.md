# TV Mode Feature

Lightweight Smart TV interface for StreamFlix, optimized for remote control navigation.

## Features

- **Lightweight UI**: No GSAP, three.js, or heavy animations. Pure CSS transitions at 60fps.
- **Remote Control Optimized**: Full keyboard/remote navigation with visible focus indicators.
- **Quick Access**: 3 giant tiles for Google Sign-in, QR Pairing, and My List at the top of home screen.
- **One-Click Actions**: All primary actions accessible with a single OK button press.

## Architecture

```
features/tv/
├── TvApp.jsx           # Root TV application component
├── tvStore.js          # MobX store for navigation and focus
├── screens/
│   ├── TvScreenRouter.jsx
│   ├── TvHomeView.jsx
│   ├── TvMyListView.jsx
│   ├── TvPairingView.jsx
│   └── TvPlayerView.jsx
├── components/
│   ├── TvQuickActionTile.jsx
│   ├── TvQuickActionRow.jsx
│   ├── TvCard.jsx
│   ├── TvListRow.jsx
│   └── TvEmptyState.jsx
└── styles/
    └── tv.css
```

## Testing

### Enable TV Mode in Browser

Add `?tv=1` to the URL to force TV mode:

```
http://localhost:3000/?tv=1
```

### Remote Control Key Mapping

| Key | Action |
|-----|--------|
| Arrow Up/Down/Left/Right | Navigate focus |
| Enter/OK | Activate focused element |
| Escape/Back | Go back to previous screen |
| Backspace | Exit TV mode (returns to home) |

### Focus Ring

The 4px blue outline indicates the currently focused element. Use arrow keys to move between elements.

## Screens

### Home Screen (`home`)
- 3 Quick Action Tiles: Google Sign-in, QR Pairing, My List
- Continue Watching row (if items exist)
- My List row (if items exist)

### My List Screen (`myList`)
- Full-screen list view
- Continue Watching as first row
- My List as second row

### Pairing Screen (`pairing`)
- Large QR code (400x400px)
- 6-digit short code in monospace font (56px)
- Numbered instructions

### Player Screen (`player`)
- Wraps existing `LocalPlaybackView` or `SlavePlaybackView`
- Keyboard-only controls
- Back button returns to home

## State Management

The `tvStore` manages:
- Current screen (`home`, `myList`, `pairing`, `player`)
- Focusable element registry (Map of id → {el, row, col, screen})
- Current focus ID
- Navigation actions

The store does NOT duplicate data from `mediaStore` or `remoteStore` - it only handles navigation.

## Performance Targets

- Bundle size: ≤ 100KB JS gzip (excluding shared dependencies)
- First Contentful Paint: < 1.5s on single-core 1GHz TV
- 60fps animations using CSS `transform` and `opacity`

## Compatibility

Tested on:
- Tizen 4+
- webOS 4+
- Roku OS 9+
- Fire TV (Silk/Chromium)
- Chromecast with Google TV
