# Quix

Quix is a modern personal streaming platform that allows users to watch movies, TV series, and anime with an intuitive Netflix-like interface. The application features real-time synchronization for watch-together experiences, Smart TV remote control capabilities, and Google Drive integration for media library management.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Key Components](#key-components)
- [WebSocket Features](#websocket-features)
- [Data Management](#data-management)
- [API Integration](#api-integration)

## Features

### Core Streaming
- **Movie Streaming**: Browse and watch latest movies with detailed information
- **TV Series**: Full series support with seasons and episodes management
- **Anime**: Dedicated anime section with automatic metadata fetching
- **Continue Watching**: Resume playback from where you left off
- **My List**: Personal watchlist with drag-and-drop reordering

### Social Features
- **Watch Together**: Create/join rooms to watch content simultaneously with friends via WebSocket
- **Real-time Chat**: In-room text chat during synchronized viewing
- **Share Library**: Export/import media library to/from Google Drive
- **QR Code Pairing**: Quick device pairing via QR scanner

### Device Integration
- **Smart TV Mode**: Transform the app into a full-screen TV experience
- **Remote Control**: Control playback on another device (master/slave relationship)
- **Media Sync**: Synchronize playback state between devices
- **Multi-device Support**: Works on desktop, tablet, and mobile browsers

### Media Management
- **Custom Video Links**: Link external video URLs to any movie or episode
- **Language Preferences**: Support for multiple audio tracks (subbed/dubbed)
- **Intro Skip Markers**: Configure intro start/end times for automatic skipping
- **Revision History**: Track all library changes with undo capability

## Architecture

Quix follows a client-server architecture with real-time WebSocket communication:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React     │  │    MobX     │  │   Material UI       │ │
│  │   (UI)      │  │   (State)   │  │   (Components)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket + HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Elysia.js Server                      │ │
│  │  - REST API Endpoints                                   │ │
│  │  - WebSocket Handler (uWebSockets)                      │ │
│  │  - Static File Serving                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │    TMDB      │  │  Google      │  │    IndexedDB     │ │
│  │   (API)      │  │  Drive       │  │   (Dexie.js)     │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **React 19** - UI framework with hooks
- **TypeScript** - Type-safe development
- **MobX** - Reactive state management
- **Material UI (MUI)** - Component library
- **Dexie.js** - IndexedDB wrapper for local persistence
- **Vite** - Build tool and dev server

### Backend
- **Elysia.js** - Modern web framework for Bun/Node.js
- **@elysiajs/websocket** - WebSocket support with uWebSockets
- **@elysiajs/cors** - CORS configuration
- **@elysiajs/static** - Static file serving

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Bun** - JavaScript runtime and package manager

## Project Structure

```
quix/
├── backend/
│   ├── src/
│   │   ├── index.ts       # Main server entry point
│   │   └── wss.ts         # WebSocket router and handlers
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── components/
│   │   ├── Card.tsx              # Media card component
│   │   ├── Chat.tsx              # Real-time chat
│   │   ├── ContentRow.tsx        # Horizontal content row
│   │   ├── DetailView.tsx        # Media detail view
│   │   ├── EpisodesDrawer.tsx    # Episode selection
│   │   ├── GridView.tsx          # Grid layout view
│   │   ├── Header.tsx            # Navigation header
│   │   ├── Hero.tsx              # Featured content hero
│   │   ├── MediaSyncModal.tsx    # Device sync modal
│   │   ├── ProfileDrawer.tsx     # User profile drawer
│   │   ├── QRScanner.tsx         # QR code scanner
│   │   ├── RemotePlayerControlView.tsx  # Remote control UI
│   │   ├── SmartTVScreen.tsx     # Full-screen TV mode
│   │   ├── VideoPlayer.tsx       # Custom video player
│   │   ├── WatchTogetherModal.tsx      # Watch together room
│   │   ├── LinkMovieModal.tsx           # Link video to movie
│   │   ├── LinkEpisodesModal.tsx       # Link videos to episodes
│   │   ├── ShareLibraryModal.tsx       # Share library
│   │   ├── ImportLibraryModal.tsx       # Import library
│   │   └── RevisionsModal.tsx           # Revision history
│   ├── services/
│   │   ├── apiCall.tsx           # TMDB API calls
│   │   ├── db.ts                 # Dexie database
│   │   ├── googleAuthService.ts  # Google OAuth
│   │   ├── googleDriveService.ts # Google Drive API
│   │   ├── shareService.ts       # Library sharing
│   │   └── websocketService.js   # WebSocket client
│   ├── store/
│   │   └── mediaStore.ts         # MobX state store (88KB)
│   ├── locales/
│   │   ├── en.ts                 # English translations
│   │   └── it.ts                 # Italian translations
│   ├── types.ts                  # TypeScript definitions
│   ├── App.tsx                   # Main app component
│   └── package.json
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                     # Production build
├── Dockerfile.backend            # Backend dev container
├── Dockerfile.frontend           # Frontend dev container
└── package.json                   # Root package.json (workspaces)
```

## Getting Started

### Prerequisites

- **Bun** (recommended) or **Node.js 18+**
- **Docker** and **Docker Compose** (for containerized deployment)

### Local Development

1. **Clone and install dependencies:**

```bash
# Install all workspace dependencies
bun install

# Or install separately
bun run install:be  # Backend
bun run install:fe  # Frontend
```

2. **Configure environment variables:**

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend (if needed)
cp frontend/.env.example frontend/.env
```

3. **Start development servers:**

```bash
# Start both frontend and backend
bun run dev:fe
bun run dev:be
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000/ws

### Docker Deployment

**Development Mode:**
```bash
bun run docker:dev
```
Starts separate frontend and backend containers with hot reload.

**Production Build:**
```bash
bun run docker:up
```
Builds and starts the production containers.

**Manual Docker Build:**
```bash
bun run docker:build
docker run -p 3000:3000 quix:latest
```

## Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=3000
NODE_ENV=development
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=60000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

### Docker Compose Profiles

| Profile | Description |
|---------|-------------|
| `dev` | Development containers with hot reload |
| (default) | Production build |

## Key Components

### MediaStore (MobX)
The central state management solution handling:
- Media library data (movies, series, anime)
- Playback state
- User preferences
- Watch history
- Search functionality
- Watch Together rooms

### Video Player
Custom video player with:
- Play/Pause/Seek controls
- Volume control
- Fullscreen support
- Playback speed adjustment
- Intro skipping (auto-skip configured intros)
- Quality selection (based on linked sources)

### Watch Together System
Real-time synchronized viewing:
1. Host creates a room
2. Participants join via room code or URL
3. Host controls playback for all
4. Real-time chat during viewing
5. Host can change media mid-session

### Smart TV Mode
Immersive full-screen experience:
- Hidden UI chrome
- Large fonts and controls
- Keyboard navigation support
- Exit via ESC key

## WebSocket Features

The backend WebSocket handler (`backend/src/wss.ts`) manages:

### Room Management
- Create/join/leave rooms
- Host designation and permissions
- Participant list updates
- Room state synchronization

### Real-time Events
- `player:play` - Start playback
- `player:pause` - Pause playback
- `player:seek` - Seek to position
- `player:mediaChange` - Change media
- `chat:message` - Send chat message

### Remote Control
- Master/slave device relationships
- State synchronization
- Media sync with progress tracking

### Heartbeat
- 30-second heartbeat interval
- 60-second timeout for dead connections
- Automatic connection cleanup

## Data Management

### Local Storage (IndexedDB via Dexie)
- **Media Items**: Cached TMDB data
- **Video Links**: User-linked video URLs
- **Watch History**: Progress tracking
- **User Preferences**: Language, sources
- **Revisions**: Change history for undo

### Google Drive Integration
- OAuth 2.0 authentication
- Export library as JSON to Drive
- Import shared libraries
- Backup and restore functionality

## API Integration

### TMDB (The Movie Database)
- Trending content
- Movie details and search
- TV series and episodes
- Anime (via TV with anime category)
- Images and backdrop paths

### Google APIs
- Google Sign-In (OAuth 2.0)
- Google Drive API (library sharing)

---

Built with ❤️ using Elysia.js, React, and Material UI
