# KAILA Product Design Document (PDD)

| Field | Value |
| --- | --- |
| Version | 1.0 |
| Status | Living Document |
| Owner | John Mark Agustin Acido |

## 1. Vision

### Mission

KAILA connects people who need services with trusted local independent service providers through a fast, modern, and reliable marketplace.

KAILA should make hiring a plumber, beautician, electrician, cleaner, tutor, gadget technician, or any local service provider feel as easy as booking a ride.

### Product Philosophy

KAILA is **not**:

- A government system
- An ERP
- An admin dashboard
- Management software
- A freelancer website

KAILA **is**:

- Consumer-first
- Mobile-first
- Highly visual
- Realtime
- Trustworthy
- Approachable
- Simple enough for first-time smartphone users

## 2. Design Principles

Every feature must satisfy these principles.

### Principle 1

One screen. One purpose.

Never overwhelm users.

### Principle 2

One obvious primary action.

Users should never wonder what to tap.

### Principle 3

Show, don't explain.

Prefer icons, timelines, progress indicators, previews, and maps over long instructions.

### Principle 4

Every tap gets feedback.

Buttons should always respond.

Never leave users wondering if something happened.

### Principle 5

Never make users think.

If users hesitate, redesign it.

### Principle 6

Fast is a feature.

Everything should feel instant.

## 3. Brand Personality

KAILA should feel:

- Friendly
- Helpful
- Modern
- Reliable
- Fast
- Local

KAILA should **not** feel:

- Corporate
- Government
- Complicated
- Technical
- Busy

## 4. Target Users

### Clients

- Homeowners
- Renters
- Students
- Families
- Small businesses
- Busy professionals

Age: 18-60+

Technical skill: Very beginner to advanced

### Providers

- Plumbers
- Electricians
- Beauticians
- Massage therapists
- Appliance technicians
- Gadget technicians
- Tutors
- Cleaners
- Carpenters
- Painters
- Mechanics
- Freelancers
- Small service businesses

## 5. User Experience Goals

Every user should be able to:

| User action | Target experience |
| --- | --- |
| Post a job | Within 60 seconds |
| Receive offers | Within minutes |
| Hire | Within 2 taps |
| Track provider | Live |
| Rate provider | Within 10 seconds |

## 6. Product Identity

### Color Palette

| Token | Value |
| --- | --- |
| Primary Blue | `#1463FF` |
| Accent Cyan | `#27B7FF` |
| Background | `#F7F9FC` |
| Card | `#FFFFFF` |
| Primary Text | `#0A1220` |
| Secondary Text | `#667085` |
| Success | `#16A36A` |
| Warning | `#F59E0B` |
| Danger | `#DC3545` |

### Typography

| Setting | Value |
| --- | --- |
| Font | Inter |
| Fallback | `system-ui` |

### Corner Radius

| Element | Radius |
| --- | --- |
| Cards | `16px` |
| Buttons | `14px` |
| Inputs | `12px` |
| Badges | `999px` |

### Spacing System

Use only these spacing values:

- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `48`

Never invent random spacing.

## 7. Iconography

Use Lucide Icons.

Never mix icon libraries.

## 8. Shadows

Use subtle elevation only.

Cards should appear soft.

Avoid floating panels everywhere.

## 9. Motion

Animations should be quick: `150-250ms`.

Never flashy.

Examples:

- Card hover
- Slide in
- Fade
- Bottom sheet
- Toast
- Loading shimmer

Do **not** use:

- Spinning pages
- Flying cards
- Long animations

## 10. Navigation

### Client

- Home
- Jobs
- Messages
- Profile

### Provider

- Opportunities
- Work
- Messages
- Profile

Bottom navigation only.

No sidebars on mobile.

## 11. Home Screen Philosophy

Home answers one question:

> What do you need right now?

Never show analytics.

Never show tables.

## 12. Job Lifecycle

1. Posted
2. Offers Received
3. Provider Selected
4. Provider Traveling
5. Working
6. Completed
7. Rated

Each stage has exactly one highlighted action.

## 13. Notifications

Notifications should be:

- Realtime
- Immediate
- Actionable

Examples:

- New offer
- Provider arrived
- Job accepted
- Payment released
- New message
- Review reminder

## 14. Trust

Every provider card should show:

- Rating
- Completed jobs
- Verified identity, only if actually verified
- Facebook linked, if connected
- Response time
- Service area
- Member since

Trust must be earned, not implied.

## 15. Accessibility

- Minimum tap target: `44px`
- Readable fonts
- High contrast
- Works outdoors
- Supports dark mode
- Supports large fonts

## 16. Performance

Targets:

- Instant interactions
- Lazy loading
- Skeleton loaders
- Optimistic UI
- Offline recovery where possible
- No unnecessary reloads

## 17. Component Library

Every screen must reuse these components:

- Buttons
- Cards
- Dialogs
- Bottom Sheets
- Navigation Bar
- Top Bar
- Timeline
- Offer Card
- Provider Card
- Job Card
- Review Card
- Map Card
- Status Badge
- Avatar
- Toast
- Skeleton
- Search Bar
- Filter Chips
- Tabs

## 18. Screens

- Authentication
- Onboarding
- Home
- Search
- Categories
- Provider Profile
- Job Details
- Post Job
- Offer Comparison
- Chat
- Notifications
- Map Tracking
- Payment
- Reviews
- Settings
- Help
- About

## 19. Tone of Voice

Use plain language.

Say:

> Post a Job

Not:

> Create Service Request

Say:

> Provider is on the way

Not:

> Travel status updated

Every sentence should sound human.

## 20. AI Development Rules

When generating code:

- Never duplicate components.
- Never hardcode colors.
- Never hardcode spacing.
- Always use design tokens.
- Prefer reusable components.
- Prefer composition.
- Never use inline styles unless absolutely necessary.
- Every page must be responsive.
- Every feature must support realtime updates.
- Always optimize for touch interaction.

## 21. Definition of Done

A feature is **not** finished until it:

- Works on desktop
- Works on Android
- Works on small phones
- Supports dark mode
- Has loading state
- Has empty state
- Has error state
- Has realtime updates, where applicable
- Meets accessibility requirements
- Matches design system

## 22. Future Vision

KAILA should eventually feel comparable in polish, not by copying features, but by matching the usability and confidence users experience in apps such as:

- Uber
- Grab
- Airbnb
- Foodpanda
- Shopee

The goal is for a first-time user to feel comfortable within minutes, and for a returning user to accomplish common tasks with minimal effort.
