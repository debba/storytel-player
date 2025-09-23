# Storytel Web Player

A modern web interface for Storytel audiobook player, built with React and Express.js.

## Features

- **Web-based Interface**: Clean, responsive UI built with React and Tailwind CSS
- **Audiobook Library**: Browse your Storytel library with cover art and progress tracking
- **Web Audio Player**: Built-in HTML5 audio player with seek controls and bookmarks
- **Session Management**: Secure login with session-based authentication
- **Bookmark Sync**: Save and resume playback position across sessions

## Architecture

- **Frontend**: React 18 with Tailwind CSS for styling
- **Backend**: Express.js server with RESTful API
- **Authentication**: Session-based with secure cookie storage
- **Audio Streaming**: Direct integration with Storytel's streaming API

## Quick Start

1. **Install all dependencies**:
   ```bash
   npm run install-all
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Available Scripts

- `npm start` - Start both client and server in production mode
- `npm run dev` - Start both in development mode with hot reload
- `npm run client` - Start only the React frontend
- `npm run server` - Start only the Express backend
- `npm run build` - Build the React app for production

## Project Structure

```
.
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   └── App.js        # Main app component
│   └── package.json      # Frontend dependencies
├── server/                # Express backend application
│   ├── server.js         # Main server file
│   ├── storytelApi.js    # Storytel API integration
│   ├── passwordCrypt.js  # Password encryption utility
│   └── package.json     # Backend dependencies
└── package.json          # Root project configuration
```

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/bookshelf` - Get user's audiobook library
- `POST /api/stream` - Get audio stream URL for a book
- `POST /api/bookmark` - Save playbook position
- `GET /api/auth/status` - Check authentication status

## Development

The application uses:
- **React 18** with modern hooks and functional components
- **Tailwind CSS** for responsive, utility-first styling
- **React Router** for client-side navigation
- **Axios** for HTTP requests
- **Express sessions** for user authentication

## Legacy TUI Version

The original Terminal UI version files are preserved in the root directory:
- `tui.js` - Original Ink-based terminal interface
- `index.js` - Original entry point
- `mpvPlayer.js` - MPV integration (replaced by web audio)

## License

This project maintains the same license as the original Rust version.