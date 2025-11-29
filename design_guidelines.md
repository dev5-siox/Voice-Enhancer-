# Design Guidelines: RingCentral Audio Processing Companion App

## Design Approach
**System:** Clean, utility-focused design inspired by Linear and Slack - emphasizing clarity, efficiency, and non-intrusive interface patterns suitable for sales productivity tools.

**Core Principle:** Minimal cognitive load during active calls. Controls must be instantly recognizable and accessible without disrupting the agent's conversation flow.

---

## Typography
- **Primary Font:** Inter (Google Fonts)
- **Monospace:** JetBrains Mono (for call timers, status codes)

**Hierarchy:**
- Dashboard headers: 24px, font-semibold
- Section titles: 16px, font-medium  
- Body text: 14px, font-normal
- Call status/metadata: 12px, font-medium
- Agent names: 14px, font-medium

---

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (e.g., p-4, gap-6, m-8)

**Grid Structure:**
- Agent Dashboard: 2-column layout (controls sidebar + agent list)
- Admin Panel: 3-column grid for monitoring 50 agents
- Control Panel: Single column, compact, max-w-sm

---

## Component Library

### A. Core Controls
**Audio Processor Toggle**
- Large, prominent switch controls (h-12)
- Clear ON/OFF states with status indicators
- Labels: "Noise Reduction" | "Accent Modifier"
- Positioned in fixed control panel (top-right or sidebar)

**Accent Preset Selector**
- Dropdown menu with preset options
- Options: "Neutral" | "Regional 1" | "Regional 2" | "Custom"
- 14px text, p-3 padding per option

**Volume/Intensity Sliders**
- Horizontal sliders for fine-tuning (w-full, max-w-xs)
- Range labels (0-100%)
- Real-time value display

### B. Status Indicators
**Processing Status Badge**
- Pill-shaped badges (px-3, py-1, rounded-full)
- States: "Active" | "Processing" | "Inactive" | "Error"
- 12px text, font-medium

**Call Metadata Display**
- Call duration timer (monospace font)
- Connection quality indicator (icon + label)
- Processing latency: "<50ms" (live update)

### C. Agent Dashboard (Individual View)
**Layout:** Compact sidebar (w-80), non-intrusive
- Header: Agent name + status
- Control toggles (stacked, gap-4)
- Preset selector
- Call information card (p-4, rounded-lg border)
- Quick mute button (always visible)

### D. Admin Monitoring Panel (50 Agents)
**Layout:** Grid view (grid-cols-3 lg:grid-cols-4, gap-4)

**Agent Card:**
- Compact card (p-4, rounded-lg, border)
- Agent name (14px, font-medium)
- Active/Inactive status badge
- Active features indicators (small icons)
- Current call duration
- Quick view of noise reduction/accent status

**Header:**
- Total agents active count
- System status overview
- Global controls (if needed)

### E. Navigation
**Minimal Tab System:**
- "My Controls" | "Team Monitor" (admin only)
- Underline indicator for active tab
- 14px, font-medium, px-4, py-2

### F. Icons
**Library:** Heroicons (via CDN)
- Microphone (for mute/unmute)
- Adjustments (for settings)
- Signal (for connection quality)
- Users (for team view)
- Check circle / X circle (for status)

---

## Interaction Patterns

**Call-Time Behavior:**
- Persistent control panel (sticky positioning)
- Keyboard shortcuts displayed on hover
- One-click toggle actions (no confirmations)
- Real-time visual feedback (<100ms response)

**State Management:**
- Clear visual distinction between active/inactive features
- Processing state shows subtle animation (optional pulse)
- Error states show inline messages (not blocking modals)

---

## Responsive Behavior
- Desktop-first (agents use computers)
- Minimum width: 1280px recommended
- Control panel: Fixed width (320px)
- Agent grid: Responsive columns (3-4 cols)

---

## Accessibility
- All toggles keyboard accessible (Tab, Space/Enter)
- Status indicators include text, not just visual cues
- ARIA labels for all interactive elements
- Focus states clearly visible (ring-2, ring-offset-2)

---

## Images
No hero images required. This is a utility application. 

**Optional Icon Set:**
- Custom illustration for "no active call" empty state
- Small waveform visualization (decorative, in processing status area)