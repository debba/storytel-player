# Agent Development Guidelines for Storytel Player

## Project Overview

**Storytel Player** is an unofficial cross-platform desktop application for playing Storytel audiobooks, built with TypeScript, React, Fastify, and Electron.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Fastify 5 + TypeScript
- **Desktop**: Electron 38+
- **Internationalization**: i18next (multi-language support)
- **State Management**: electron-store for persistent storage
- **Build Tools**: Vite, esbuild, electron-builder

### Architecture
```
storytel-player/
├── client/          # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API services
│   │   ├── utils/       # Utility functions
│   │   └── i18n.ts      # i18next configuration
│   └── package.json
├── server/          # Fastify backend server
│   ├── server.ts        # Main server file
│   ├── storytelApi.ts   # Storytel API integration
│   ├── locales/         # Translation files
│   └── package.json
├── src/             # Electron main process
│   ├── modules/         # Electron modules (IPC, window, tray, etc.)
│   ├── main.ts          # Electron entry point
│   └── preload.ts       # Electron preload script
└── package.json     # Root package.json
```

## Development Guidelines

### Language Requirements

#### Code and Documentation
- **ALL documentation files** (README, CONTRIBUTING, AGENTS.md, etc.) **MUST be written in English**
- **ALL code comments** MUST be written in English
- **ALL commit messages** MUST be written in English
- **ALL variable names, function names, and identifiers** MUST be in English

#### User-Facing Content
- **ALL user-facing text** (UI labels, messages, errors) MUST use the i18n translation system
- Never hardcode user-facing strings in components
- Always add new strings to translation files in `server/locales/`

#### Translation System
- **Location**: Translation files are in `server/locales/`
  - `server/locales/en.json` - English translations (default)
  - `server/locales/it.json` - Italian translations
  - Add more languages as needed

- **Usage in Frontend**:
  ```typescript
  import { useTranslation } from 'react-i18next';

  function MyComponent() {
    const { t } = useTranslation();
    return <div>{t('key.name')}</div>;
  }
  ```

- **Usage in Backend**:
  ```typescript
  // Server automatically provides translations via API
  // Use i18next instance configured in server
  ```

- **Adding New Translations**:
  1. Add the key to `server/locales/en.json`
  2. Add translations to all other language files (`it.json`, etc.)
  3. Use the key in your component with `t('your.new.key')`

### Code Style

- **TypeScript**: Strict mode enabled, use proper typing
- **React**: Functional components with hooks
- **CSS**: Tailwind CSS utility classes
- **Formatting**: Follow existing code style in the project

### Component Patterns

- Use existing modal components as reference (see `client/src/components/*Modal.tsx`)
- Follow existing hook patterns (see `client/src/hooks/`)
- Maintain consistent UI/UX with Tailwind classes already in use
- Reuse common components when possible

### State Management

- **Local State**: React hooks (useState, useEffect, etc.)
- **Persistent Storage**: Use `electron-store` via IPC for desktop persistence
- **API State**: Direct API calls via Axios (see `client/src/utils/api.ts`)

### Development Workflow

1. **Install dependencies**: `npm run install-all`
2. **Development mode**: `npm run dev` (runs both client and server with hot reload)
3. **Electron dev**: `npm run electron:dev`
4. **Build**: `npm run build` (builds client and server)
5. **Electron distribution**: `npm run electron:dist` (creates distributable packages)

### Testing Strategy

- Manual testing in development mode
- Test across platforms (Windows, macOS, Linux)
- Verify i18n translations for all supported languages
- Test both online and offline modes

## Project-Specific Patterns

### Modal Components
- Follow the pattern in existing modal components
- Use proper state management with hooks
- Include proper TypeScript interfaces
- Ensure proper i18n integration

### Storage Keys
- Use descriptive names for storage keys
- Document storage schema in code comments
- Use TypeScript interfaces for stored data structures

### API Integration
- Backend API calls go through `client/src/utils/api.ts`
- Storytel API integration is in `server/storytelApi.ts`
- Handle errors gracefully with user feedback

### IPC Communication
- Electron IPC handlers are in `src/modules/ipc.ts`
- Frontend uses `window.electron` API (typed in `client/src/types/window.d.ts`)
- Always handle both success and error cases

## Important Notes

- **Security**: This is a desktop app with persistent session storage
- **Authentication**: Session-based with secure storage via electron-store
- **Single Instance**: App uses single instance lock (one app instance at a time)
- **Updates**: Electron updater is integrated for auto-updates
- **Offline Mode**: Support for downloading audiobooks for offline playback

## Git Repository

- **Repository**: https://github.com/debba/storytel-player
- **Issues**: https://github.com/debba/storytel-player/issues
- **Releases**: https://github.com/debba/storytel-player/releases

## Discord Community

- Discord server for community discussions, feature requests, and support
- Link will be added once the welcome modal implementation is complete

## License

MIT License - see LICENSE file for details

---

**Remember**:
1. Documentation and code in English
2. User-facing content via i18n system
3. Follow existing patterns in the codebase
4. Test thoroughly before committing
