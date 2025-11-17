# Sports Intel Dashboard

## Overview

A single-page sports intelligence dashboard that displays curated information across Basketball, Football, and Soccer. The application provides a clean, information-dense interface for tracking games, rumors, injuries, and news without noise or distractions. Built with React (Vite), Express.js backend, and currently uses in-memory storage with plans for PostgreSQL integration via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with Vite for fast development and optimized production builds
- TypeScript for type safety across the application
- Wouter for lightweight client-side routing (currently single-page)

**UI Component System**
- shadcn/ui components (New York variant) with Radix UI primitives
- Tailwind CSS with custom design tokens following sports data platform aesthetics
- Design philosophy: Maximum information clarity with minimum visual noise
- Typography: Inter for primary text, JetBrains Mono for scores/timestamps
- Custom color scheme for sport-specific visual coding (live games, injuries, rumors, news)

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local React state for UI filters and user interactions
- Theme context provider for dark/light mode support

**Data Flow Pattern**
- RESTful API calls via React Query hooks
- Client-side filtering logic for sports, content types, time ranges, and search
- Memoized filtering computations for performance optimization

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Custom middleware for request logging and JSON body parsing
- Vite integration for development with HMR

**API Design**
- RESTful endpoints:
  - `GET /api/games` - Returns all game data
  - `GET /api/info-items` - Returns all info items (rumors, injuries, news)
- Simple response format with error handling
- No authentication currently implemented

**Storage Layer**
- Current: In-memory storage (MemStorage class) with seeded mock data
- Planned: PostgreSQL via Drizzle ORM
- Storage interface pattern (IStorage) allows easy swapping between implementations
- Data models defined in shared schema with Zod validation

### Data Schema & Types

**Core Entities**
- **Game**: Tracks sports matches with teams, scores, status (upcoming/live/finished), and timing
- **InfoItem**: Unified entity for rumors, injuries, and news with sport association, player/team references, and source tracking
- **Sport**: Basketball, Football, Soccer as enumerated types

**Validation Strategy**
- Zod schemas for runtime validation
- TypeScript types derived from Zod schemas for compile-time safety
- Shared schema file consumed by both client and server

**Filter Types**
- Sport filters (multi-select)
- Content type filters (games, rumors, injuries, news)
- Time range filters (24h, 3d, 7d)
- Text search across titles and descriptions

### Design System

**Component Hierarchy**
- **Dashboard** (page): Main container with filter state management
- **FilterBar**: Sticky filter controls with sport pills, checkboxes, dropdowns, and search
- **GamesSection**: Grid layout of game cards
- **InfoSection**: Vertical stack of info cards
- **GameCard**: Individual game display with status badges and scores
- **InfoCard**: Individual info item with type-coded left border and badges

**Responsive Strategy**
- Mobile-first approach with Tailwind breakpoints
- Horizontal scrolling for filters on mobile
- Grid layouts collapse to single column on small screens
- Max-width container (7xl) with responsive horizontal padding

**Visual Hierarchy**
- Status indicators: Color-coded badges for game status and info types
- Spacing system: Consistent Tailwind units (2, 3, 4, 6, 8)
- Card elevation: Subtle hover states for interactive feel
- Typography scale: From xs metadata to 2xl page titles

## External Dependencies

**UI & Styling**
- Radix UI primitives for accessible component foundations
- Tailwind CSS for utility-first styling
- class-variance-authority for component variant management
- Lucide React for consistent iconography

**Data & State Management**
- TanStack Query (React Query) for server state
- date-fns for date formatting and manipulation
- Zod for schema validation

**Database & ORM** (Configured but not actively used)
- Drizzle ORM for PostgreSQL interaction
- drizzle-zod for schema-to-Zod conversion
- @neondatabase/serverless for Neon PostgreSQL client
- Migration configuration points to `./migrations` directory

**Development Tools**
- Vite for development server and bundling
- tsx for TypeScript execution
- esbuild for production server bundling
- PostCSS with Autoprefixer for CSS processing

**Replit-Specific Integrations**
- @replit/vite-plugin-runtime-error-modal for error overlay
- @replit/vite-plugin-cartographer for code navigation
- @replit/vite-plugin-dev-banner for development indicator

**Session Management**
- connect-pg-simple configured for PostgreSQL session storage (unused with current in-memory approach)