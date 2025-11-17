# Sports Intel Dashboard - Design Guidelines

## Design Approach

**System Selection**: Modern Sports Data Platform aesthetic, drawing from ESPN's information density + Linear's clean typography + Stripe Dashboard's restrained professionalism.

**Core Principle**: Maximum information clarity with minimum visual noise. This is a scanning tool, not a destination experience.

## Typography System

**Font Stack**: 
- Primary: Inter (Google Fonts) - exceptional readability at small sizes
- Monospace: JetBrains Mono - for scores and timestamps

**Hierarchy**:
- Page Title: text-2xl font-bold
- Section Headers: text-lg font-semibold 
- Card Titles: text-base font-medium
- Body/Details: text-sm
- Metadata (timestamps, sources): text-xs text-gray-400

## Layout System

**Spacing Primitives**: Tailwind units of 2, 3, 4, 6, 8
- Card padding: p-4
- Section spacing: space-y-6
- Filter gaps: gap-3
- Card gaps: gap-4

**Container Strategy**:
- Max width: max-w-7xl mx-auto
- Horizontal padding: px-4 md:px-6 lg:px-8
- Full viewport height with internal scroll

## Component Library

### 1. Header Bar
- Fixed top position with backdrop blur (backdrop-blur-md)
- Title left-aligned, no hero section needed
- Height: h-16
- Border bottom: subtle 1px divider

### 2. Filter Bar
**Layout**: Sticky positioning (sticky top-16) with horizontal scrolling on mobile
**Components**:
- Sport Pills: Rounded-full toggle buttons with ring-2 for active state
- Type Checkboxes: Checkbox + label in flex layout
- Time Dropdown: Select element styled consistently
- Search Input: w-full md:w-64 with search icon prefix

**Spacing**: Wrap in flex flex-wrap gap-3, group related filters together

### 3. Game Cards
**Layout**: Grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
**Card Structure**:
- Border with rounded-lg
- Padding p-4
- Hover state: subtle shadow transition
- Badge row: Sport + League (text-xs, inline-flex gap-2)
- Teams: font-semibold text-base, vs centered between
- Score: text-2xl font-bold monospace, - for TBD
- Status badge: Absolute top-right, color-coded (red=LIVE, green=FINAL, gray=UPCOMING)
- Timestamp: text-xs bottom

### 4. Info Cards  
**Layout**: Single column stack, space-y-3
**Card Structure**:
- Left border accent (border-l-4) - color by type:
  - Rumors: yellow-500
  - Injuries: red-500  
  - News: blue-500
- Padding: p-4 pl-4
- Badge cluster top: Type badge + Sport badge (gap-2, text-xs)
- Title: text-base font-medium, line-clamp-2
- Player/Team row: text-sm, flex gap-2 with separator dots
- Description: text-sm text-gray-400, line-clamp-3
- Footer: flex justify-between (Source link + timestamp)

### 5. Empty States
When no results: Centered text-gray-500, "No items match your filters"

### 6. Badges
**Pill style**: 
- px-2 py-1 rounded-full text-xs font-medium
- Ring variants for active states (ring-2 ring-offset-2)

## Section Layout

**Structure (top to bottom)**:
1. Header (fixed)
2. Filter Bar (sticky)
3. Latest Games Section
   - Section title with count "(12 games)"
   - Grid of game cards
4. Spacer (h-8)
5. News & Updates Section  
   - Section title with count "(24 items)"
   - Stacked info cards

## Interaction Patterns

**Filter Behavior**: 
- Instant results (no submit button)
- Active filters show count badges
- "Clear all" link appears when filters active

**Card Interactions**:
- Subtle hover lift (shadow-md transition)
- Entire card clickable for external links
- No loading states needed (using mock data)

**Search**: 
- Real-time filtering as user types
- Clear button appears when text present

## Animations

**Minimal approach**:
- Filter updates: No animation, instant
- Card hover: transform scale-[1.01] duration-150
- No scroll animations or page transitions

## Accessibility

- All interactive elements have focus rings (focus:ring-2)
- Badge colors maintain 4.5:1 contrast ratio
- Form labels always visible (no placeholder-only inputs)
- Time badges use relative time + ISO title attribute

## Images

**No images required** for this dashboard. Sport/team icons use icon font (Font Awesome for team logos/sport icons via CDN).

This is a text and data-first interface optimized for rapid information scanning.