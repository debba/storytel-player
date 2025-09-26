# Storytel Player

A desktop application for playing Storytel audiobooks, built with React, Fastify, and Electron.

## Features

- **Desktop App**: Native desktop application with system tray integration
- **Audiobook Library**: Browse your Storytel library with cover art and progress tracking
- **Audio Player**: Built-in HTML5 audio player with seek controls and bookmarks
- **Session Management**: Secure login with session-based authentication
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Development Mode**: Hot reload for both client and server during development

## Architecture

The application follows a multi-tier architecture:

- **Frontend**: React 18 with Tailwind CSS (port 3000 in dev mode)
- **Backend**: Fastify server with RESTful API (Express.js alternative)
- **Desktop**: Electron wrapper for native desktop experience
- **Authentication**: Session-based with secure cookie storage
- **Audio Streaming**: Direct integration with Storytel's streaming API

## Prerequisites

- Node.js 16+
- npm 7+

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd storytel-player
```

2. Install all dependencies:
```bash
npm run install-all
```

This command will install dependencies for the root project, server, and client.

## Development

Start the development environment with hot reload:

```bash
npm run dev
```

This will:
- Start the Fastify server on port 8080 (with nodemon for auto-restart)
- Start the React development server on port 3000
- Both servers will reload automatically when files change

### Individual Components

You can also run components separately:

```bash
# Start only the server (development mode)
npm run server:dev

# Start only the client
npm run client

# Start both (without hot reload)
npm start
```

### Electron Development

To run the Electron app in development mode:

```bash
npm run electron:dev
```

## Building

### Build for Production

Build all components for production:

```bash
npm run build
```

This command:
1. Builds the React client (`client/build/`)
2. Builds the server with esbuild (`server/dist/`)

### Build Electron App

Create distributable Electron packages:

```bash
# Package without installer
npm run electron:pack

# Create installer/distributable
npm run electron:dist
```

The built applications will be available in the `dist/` directory.

### Platform-specific Builds

The app is configured to build for:
- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: Pacman package

## Project Structure

```
storytel-player/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # React source code
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── App.js         # Main App component
│   └── package.json       # Client dependencies
├── server/                # Fastify backend
│   ├── dist/              # Built server (production)
│   ├── fastify-common.js  # Fastify configuration
│   ├── storytelApi.js     # Storytel API integration
│   ├── server.js          # Server entry point
│   └── package.json       # Server dependencies
├── dist/                  # Electron build output
├── electron.js            # Electron main process
└── package.json           # Root and Electron config
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start both client and server (production mode) |
| `npm run dev` | Start development servers with hot reload |
| `npm run build` | Build client for production |
| `npm run server:build` | Build server with esbuild |
| `npm run install-all` | Install dependencies for all components |
| `npm run clean` | Clean all build directories |
| `npm run electron` | Run Electron app (production) |
| `npm run electron:dev` | Run Electron app (development) |
| `npm run electron:pack` | Package Electron app |
| `npm run electron:dist` | Create Electron installer |

## Configuration

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Add your environment variables here
# See server/.env.example for reference
```

### Electron Builder

Electron Builder configuration is in `package.json` under the `build` key:

- **App ID**: `com.storytel.player`
- **Product Name**: `Storytel Player`
- **Output Directory**: `dist/`

## Development Notes

- The Electron app runs on a fixed window size (480x800) and is always on top
- In development mode, both React and Fastify servers run concurrently
- The production build uses esbuild for the server for faster builds
- ASAR packaging excludes the server directory for proper file access

## Technologies Used

- **Frontend**: React 18, Tailwind CSS, Axios
- **Backend**: Fastify, JWT authentication, CORS
- **Desktop**: Electron 38+
- **Build Tools**: React Scripts, esbuild, electron-builder
- **Development**: Concurrently, Nodemon

## License

ISC License

## Author

Andrea Debba (andrea@debbaweb.it)
