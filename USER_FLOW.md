# Quix - User Flow Documentation

This document describes all use cases of the Quix streaming platform, divided into three main operational modes: **Standalone**, **Master/Slave (SmartTV)**, and **Watch Together**.

---

## Table of Contents

1. [Standalone Mode](#1-standalone-mode)
2. [Master/Slave Mode (SmartTV)](#2-masterslave-mode-smarttv)
3. [Watch Together Mode](#3-watch-together-mode)
4. [Common Features Across Modes](#4-common-features-across-modes)

---

## 1. Standalone Mode

Standalone mode is the default single-user experience where a user browses the media library and streams content directly on their device.

### 1.1 Media Library Browsing

| Feature | Description |
|---------|-------------|
| **Hero Banner** | Featured content displayed on the home screen with backdrop image and description |
| **Content Rows** | Horizontal scrolling rows organized by category (Movies, TV Series, Anime, Continue Watching, My List) |
| **Grid View** | Alternative layout showing all items in a grid format |
| **Search** | Global search across movies, TV series, and anime by title |
| **Filtering** | Filter content by media type (Movies, TV Series, Anime) |
| **Theme Selection** | Three visual themes: Film (amber), SerieTV (blue), Anime (purple) |

### 1.2 Content Details

| Feature | Description |
|---------|-------------|
| **Detail View** | Full information page for selected media including poster, backdrop, synopsis, cast, genres |
| **Season/Episode Selection** | For TV series, browse seasons and episodes with thumbnails |
| **Trailer Preview** | Play trailers from TMDB when available |
| **Rating Display** | Show TMDB rating and vote count |
| **Release Info** | Display release date and runtime information |

### 1.3 Video Playback

| Feature | Description |
|---------|-------------|
| **Custom Video Player** | Full-featured player with Netflix-like controls |
| **Play/Pause** | Toggle playback with spacebar or click |
| **Seek** | Progress bar seeking with time preview |
| **Volume Control** | Volume slider with mute toggle |
| **Playback Speed** | Adjust speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x) |
| **Fullscreen** | Toggle fullscreen mode (F key or button) |
| **Quality Selection** | Choose from available video quality/link sources |
| **Intro Skipping** | Auto-skip configured intro segments |
| **Auto-play Next Episode** | Automatically play next episode in series |

### 1.4 Library Management

| Feature | Description |
|---------|-------------|
| **My List** | Personal watchlist with drag-and-drop reordering |
| **Add to List** | Add/remove items from My List |
| **Continue Watching** | Resume playback from where you left off |
| **Watch History** | Track all watched content with timestamps |
| **Video Linking** | Link external video URLs to movies or episodes |
| **Language Preferences** | Select preferred audio/subtitle tracks when available |

### 1.5 Media Sync (Device to Device)

| Feature | Description |
|---------|-------------|
| **Export Library** | Export entire media library (movies, series, links) to Google Drive as JSON |
| **Import Library** | Import library from Google Drive JSON file |
| **Sync Conflict Resolution** | Handle conflicts when importing (keep local, keep remote, or merge) |
| **Revision History** | Track all library changes with undo capability |
| **Media Item Sync** | Sync individual media items with links to slave devices |

---

## 2. Master/Slave Mode (SmartTV)

Master/Slave mode enables remote control functionality where one device (the **Master**) controls playback on another device (the **Slave**, typically a SmartTV or browser on a big screen).

### 2.1 Device Pairing

| Feature | Description |
|---------|-------------|
| **QR Code Pairing** | Slave displays QR code; Master scans to connect |
| **Manual Short Code** | Enter 6-character short code for pairing |
| **Persistent Connection** | Connection survives page reloads on slave |
| **Multi-Device Support** | Master can control one slave at a time |
| **Known Devices** | Remember paired slaves with custom names |
| **Disconnect/Reconnect** | Easily reconnect to previously paired devices |

### 2.2 Slave (TV Display) Features

The slave device runs in SmartTV mode, providing a full-screen immersive viewing experience.

| Feature | Description |
|---------|-------------|
| **Full-Screen Playback** | Immersive video display without UI chrome |
| **Minimal UI** | Clean interface showing only essential info |
| **Pairing QR Code** | Display QR code for master connection |
| **Connection Status** | Visual indicator of master connection state |
| **Reconnecting State** | Loading screen during reconnection |
| **Connected State** | Confirmation display when master is connected |
| **Playback Controls** | Play/pause/seek controlled by master |
| **Status Updates** | Send playback state to master (time, playing status) |
| **Keyboard Navigation** | Support for TV remote navigation |
| **ESC to Exit** | Press ESC to exit SmartTV mode |

### 2.3 Master (Remote Control) Features

The master device provides a full remote control interface to manage the slave's playback.

#### Navigation & Browsing

| Feature | Description |
|---------|-------------|
| **Full Library Access** | Browse entire media library |
| **Grid/Row Views** | Multiple browsing layouts |
| **Detail View** | Full media information |
| **Episode Selection** | Choose specific episodes for series |
| **Search** | Search across all content |

#### Playback Control

| Feature | Description |
|---------|-------------|
| **Play/Pause** | Control slave playback state |
| **Seek** | Scrub through content |
| **Stop** | Stop playback completely |
| **Play Specific Item** | Play a movie or episode on slave |
| **Select from List** | Choose video source when multiple links available |
| **Current Time Display** | Show current position on slave |
| **Duration Display** | Show total duration |

#### Series Management

| Feature | Description |
|---------|-------------|
| **Season Browser** | View all seasons of a series |
| **Episode List** | Browse episodes with thumbnails |
| **Next Episode** | Jump to next episode |
| **Previous Episode** | Go to previous episode |
| **Auto-Progress** | Track which episode is playing on slave |

#### Media Sync

| Feature | Description |
|---------|-------------|
| **Sync Media to Slave** | Transfer media library links to slave |
| **Progress Tracking** | Real-time sync progress display |
| **Selective Sync** | Choose specific items to sync |
| **Sync Completion** | Notification when sync finishes |
| **Error Handling** | Display and handle sync failures |

### 2.4 Connection Management

| Feature | Description |
|---------|-------------|
| **Heartbeat Monitoring** | 30-second ping interval for connection health |
| **Connection Health Indicator** | Good/poor/dead connection status |
| **Auto-Reconnect** | Automatic reconnection on connection loss |
| **Graceful Disconnect** | Proper cleanup when master disconnects |
| **Session Preservation** | Slave session survives brief disconnections |

---

## 3. Watch Together Mode

Watch Together mode enables multiple users to watch content simultaneously in synchronized rooms with real-time chat and host controls.

### 3.1 Room Management

#### Creating a Room

| Feature | Description |
|---------|-------------|
| **Create Room** | Host creates a new watch together room |
| **Share Media** | Select initial movie or episode to share |
| **Room Code** | Auto-generated 6-character room code |
| **Share URL** | Direct link to join room |
| **Copy Code** | One-click copy of room code |
| **Change Code** | Host can generate new room code |

#### Joining a Room

| Feature | Description |
|---------|-------------|
| **Join by Code** | Enter 6-character room code |
| **Join by URL** | Click direct room link |
| **Username Entry** | Set display name when joining |
| **Season Selection** | Choose starting season for series |
| **URL Auto-Join** | Automatic join when opening room URL |

#### Room State

| Feature | Description |
|---------|-------------|
| **Participant List** | View all users in the room |
| **Host Indicator** | Show who is the host |
| **Participant Names** | Display and edit participant names |
| **Room ID** | Unique room identifier |
| **Error Handling** | Display connection/join errors |

### 3.2 Host Controls

The host has exclusive control over the viewing session.

| Feature | Description |
|---------|-------------|
| **Media Selection** | Choose what to watch |
| **Playback Control** | Play/pause for everyone |
| **Seek Control** | Seek to position for everyone |
| **Change Media** | Switch to different content mid-session |
| **Transfer Host** | Pass host role to another participant |
| **Kick Participant** | Remove participant from room |
| **Change Room Code** | Generate new access code |

### 3.3 Synchronized Playback

| Feature | Description |
|---------|-------------|
| **PlaySync** | All participants play simultaneously |
| **Pause Sync** | All participants pause simultaneously |
| **Seek Sync** | All participants seek to same position |
| **Media Change Sync** | Everyone watches same content |
| **Latency Compensation** | Automatic adjustment for network delay |
| **Playback Speed Sync** | All participants at same speed |

### 3.4 Real-Time Chat

| Feature | Description |
|---------|-------------|
| **Text Messages** | Send text messages to room |
| **Image Sharing** | Share images in chat (base64 encoded) |
| **Chat History** | Persistent chat during session |
| **Message Timestamps** | Show when messages were sent |
| **Auto-Scroll** | Chat scrolls to newest messages |
| **Image Size Limit** | ~256KB max image size |

### 3.5 Participant Experience

| Feature | Description |
|---------|-------------|
| **View Only Controls** | No playback control for non-hosts |
| **Receive Sync** | Automatic playback sync from host |
| **Chat Participation** | Send and receive messages |
| **Name Editing** | Change own display name |
| **Leave Room** | Exit room at any time |
| **Host Migration** | If host leaves, new host assigned |

---

## 4. Common Features Across Modes

These features work consistently in all operational modes.

### 4.1 User Interface

| Feature | Description |
|---------|-------------|
| **Responsive Design** | Adapts to desktop, tablet, mobile |
| **Theme System** | Film/SerieTV/Anime color schemes |
| **Localization** | English and Italian translations |
| **Notifications** | Toast messages for actions |
| **Loading States** | Spinners and progress indicators |
| **Error Messages** | Clear error feedback |
| **Keyboard Shortcuts** | Space (play/pause), F (fullscreen), ESC (exit) |

### 4.2 Data Persistence

| Feature | Description |
|---------|-------------|
| **IndexedDB Storage** | Local caching via Dexie.js |
| **Cached Items** | TMDB metadata cached locally |
| **Video Links** | User-linked video URLs stored locally |
| **Watch History** | Progress and history tracked |
| **User Preferences** | Language, theme, sources saved |
| **Known Devices** | Paired slaves remembered |

### 4.3 WebSocket Communication

| Feature | Description |
|---------|-------------|
| **Real-Time Events** | Instant message delivery |
| **Auto Reconnect** | Automatic reconnection on disconnect |
| **Heartbeat** | 30-second keep-alive pings |
| **Connection State** | Track connected/disconnected status |
| **Error Propagation** | Errors displayed to user |

### 4.4 External Integrations

| Feature | Description |
|---------|-------------|
| **TMDB API** | Movie/TV/Anime metadata and trailers |
| **Google OAuth** | Sign in with Google |
| **Google Drive** | Export/import library backups |

---

## Flow Diagrams

### Standalone Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Launch   │────▶│   Browse    │────▶│   Select    │
│   App      │     │   Library   │     │   Media     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌───────────────────────────┤
                    ▼                           ▼
             ┌─────────────┐            ┌─────────────┐
             │  Detail     │            │   Play      │
             │  View       │            │   Video     │
             └─────────────┘            └─────────────┘
                    │                           │
                    ▼                           ▼
             ┌─────────────┐            ┌─────────────┐
             │  Add to     │            │  Playback   │
             │  My List    │            │  Controls   │
             └─────────────┘            └─────────────┘
```

### Master/Slave Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Slave     │     │   Pairing   │     │   Master    │
│   Opens     │────▶│   (QR/Code)  │◀────│   Scans     │
│   SmartTV   │     └─────────────┘     └─────────────┘
└─────────────┘                                    │
       │                                           │
       ▼                                           ▼
┌─────────────┐                            ┌─────────────┐
│   Waiting   │                            │   Browse    │
│   for       │                            │   Library   │
│   Master    │                            └─────────────┘
└─────────────┘                                    │
       │                                           │
       │◀──────────────────────────────────────────┘
       │              Control Commands
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Receive   │────▶│   Play on   │────▶│   Status    │
│   Command   │     │   TV        │     │   Update    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Watch Together Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Host      │     │   Create    │     │   Share     │
│   Creates   │────▶│   Room       │────▶│   Code/URL  │
│   Room      │     └─────────────┘     └─────────────┘
└─────────────┘                                    │
                                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Participants│    │   Join      │     │  Connected  │
│   Join      │◀────│   Room      │◀────│  Room       │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│   Chat &    │◀────────────────────────│  Host       │
│   Watch     │                         │  Controls   │
└─────────────┘                         │  Sync       │
       │                                └─────────────┘
       │                                       │
       └───────────────────────────────────────┘
                    Playback Synced
```

---

## Technical Notes

### WebSocket Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `quix-register-slave` | C→S | Slave registers with server |
| `quix-register-master` | C→S | Master registers for slave |
| `quix-create-room` | C→S | Create watch together room |
| `quix-join-room` | C→S | Join existing room |
| `quix-playback-control` | C→S→C | Sync play/pause/seek |
| `quix-chat-message` | C→S→C | Room chat messages |
| `quix-remote-command` | C→S→C | Master→Slave commands |
| `quix-slave-status-update` | C→S→C | Slave→Master status |
| `quix-sync-media-request` | C→S→C | Media library sync |

### Database Schema (IndexedDB)

| Store | Contents |
|-------|----------|
| `cachedItems` | TMDB media metadata |
| `mediaLinks` | User-linked video URLs |
| `myList` | User's watchlist items |
| `watchHistory` | Playback progress |
| `preferences` | User settings |
| `knownSlaves` | Paired SmartTV devices |
| `revisions` | Library change history |
