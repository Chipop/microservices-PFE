# FlowForge Frontend Prototype

A complete Vue 3 + TypeScript + Vite prototype for a Workspace → Projects → Tasks product.

## Included

- Authentication screens
- Fixed top navigation and responsive collapsible sidebar
- Workspace switching
- Home, search, notifications, profile, security and sessions
- Workspace list, members and settings
- Projects list and project creation
- Project Overview, Board, List, Timeline, Backlog, Files and Settings
- All Tasks and detailed task pages
- Working mock filtering, workspace switching, creation, task editing and board movement
- Mock notification store with a WebSocket-ready lifecycle
- Separate repository/data layer so REST APIs can replace mocks later

## Run

```bash
npm install
npm run dev
```

## Backend integration

The frontend currently uses `src/data/repositories.ts`. Replace repository methods with calls through the API gateway configured by:

```env
VITE_GATEWAY_URL=http://localhost:8080
VITE_USE_MOCKS=false
```

Notifications should load through REST, then connect to:

```text
ws://localhost:8080/ws/notifications?access_token=<access_token>
```

The frontend must never consume RabbitMQ directly.
