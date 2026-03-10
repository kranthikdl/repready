# RepReady - Real-time SDR Coaching Demo

## Overview
RepReady is a real-time AI coaching demo for SDR readiness. It supports simulated and live sales calls, detects coaching-relevant moments, surfaces short coaching prompts during the session, and generates a post-call summary with a readiness scorecard.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Real-time**: WebSocket (ws library) for live transcript streaming
- **Persistence**: In-memory storage (demo app)
- **Theme**: Dark mode by default

## Key Files
- `shared/schema.ts` - All TypeScript types and Zod schemas
- `server/routes.ts` - REST API endpoints
- `server/services/sessionSocket.ts` - WebSocket handler for live sessions
- `server/services/coachingEngine.ts` - Coaching prompt generation with cooldown logic
- `server/services/rulesEngine.ts` - Deterministic rule-based coaching detection
- `server/services/simulationService.ts` - Pre-built transcript scripts
- `server/services/summaryService.ts` - Post-call summary generation
- `server/services/storageService.ts` - In-memory session storage
- `client/src/pages/SessionSetup.tsx` - Session configuration form
- `client/src/pages/LiveSession.tsx` - Live 3-column session view
- `client/src/pages/SessionReview.tsx` - Post-call review with tabs
- `client/src/pages/PreviousSessions.tsx` - Session history list
- `client/src/lib/socket.ts` - WebSocket client wrapper

## Modes
1. **Simulation Mode** - Uses scripted transcripts that stream automatically
2. **Live Mode** - Browser microphone capture (requires transcription API setup)

## Running
- `npm run dev` starts both Express backend and Vite frontend
- WebSocket server runs on the same port at `/ws`

## Customizing Coaching Rules
- Edit `server/services/rulesEngine.ts` to modify detection heuristics
- Edit `server/services/coachingEngine.ts` to modify prompt responses and cooldown timing
- Add new simulation scripts in `server/services/simulationService.ts`
