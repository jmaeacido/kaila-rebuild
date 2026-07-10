# KAILA Design System

| Field | Value |
| --- | --- |
| Version | 1.0 |
| Status | Living Document |
| Product | KAILA |

## 1. Design Philosophy

KAILA should combine:

- Uber's simplicity
- Grab's friendliness
- Airbnb's cleanliness
- Google Maps' familiarity
- Foodpanda's speed

KAILA should never feel like:

- AdminLTE
- Bootstrap Admin
- An ERP
- A government system
- An internal dashboard

The interface should disappear so users can focus on getting work done.

### Core Brand-Recognition Principle

> Every screen should be recognizable as KAILA even if the logo is hidden.

KAILA's color palette, typography, spacing, card treatments, motion, icons, and interaction patterns must work together as a consistent product signature. A logo should confirm the brand, not carry it alone.

Apply this principle by:

- Reusing design tokens instead of introducing one-off visual decisions.
- Keeping component structure and interaction behavior consistent across screens.
- Using KAILA's blue and cyan, route-inspired accents, rounded surfaces, and location-first information deliberately.
- Reviewing logo-free screenshots during design QA. If a screen could belong to any marketplace, strengthen the KAILA design language without adding decorative clutter.

## 2. Brand Personality

| Trait | Description |
| --- | --- |
| Friendly | Welcoming and human |
| Trustworthy | Safe and dependable |
| Modern | Clean and uncluttered |
| Fast | Responsive and lightweight |
| Local | Built for communities |
| Helpful | Guides users at every step |

## 3. Logo Usage

The approved KAILA logo is the primary brand mark.

### Primary Version

- Blue background
- White map pin
- Blue `K`
- Blue tools
- Cyan accent

### Clear Space

Keep clear space equal to at least half (`0.5x`) the logo's width on every side.

### Never

- Stretch or distort the logo.
- Rotate the logo.
- Add shadows or outlines.
- Change its colors.
- Place it on a busy background.

## 4. Color System

### Brand Colors

| Token | Name | Value | Usage |
| --- | --- | --- | --- |
| `--color-primary` | KAILA Blue | `#1463FF` | Buttons, links, active tabs, progress, and navigation |
| `--color-accent` | KAILA Cyan | `#27B7FF` | Highlights, glows, active states, map accents, and loading animation |

### Neutral Colors

| Token | Name | Value |
| --- | --- | --- |
| `--color-ink` | Ink | `#0A1220` |
| `--color-text` | Text | `#344054` |
| `--color-text-secondary` | Secondary text | `#667085` |
| `--color-border` | Border | `#E6EAF0` |
| `--color-background` | Background | `#F7F9FC` |
| `--color-surface` | Surface | `#FFFFFF` |

### Semantic Colors

| Token | Name | Value |
| --- | --- | --- |
| `--color-success` | Success | `#16A36A` |
| `--color-warning` | Warning | `#F59E0B` |
| `--color-danger` | Danger | `#DC3545` |
| `--color-info` | Information | `#1463FF` |

Semantic colors communicate meaning and must not be reassigned for decoration.

## 5. Gradients

Use only these two gradients:

| Token | Stops | Usage |
| --- | --- | --- |
| `--gradient-primary` | `#1463FF` to `#27B7FF` | Branded emphasis |
| `--gradient-hero` | `#0F4BFF` to `#3CC8FF` | Hero areas |

Never use rainbow gradients.

## 6. Typography

Use `Inter`, with `system-ui` as the fallback.

### Type Scale

| Style | Size | Suggested weight |
| --- | --- | --- |
| Display | `36px` | `700` |
| Heading | `28px` | `700` |
| Section | `22px` | `600` |
| Card title | `18px` | `600` |
| Body | `16px` | `400` or `500` |
| Small | `14px` | `400` or `500` |
| Caption | `12px` | `500` |

Allowed font weights are `400`, `500`, `600`, and `700`. Do not use ultra-light fonts.

## 7. Icons

Use Lucide icons only.

- Keep stroke widths consistent.
- Prefer rounded, simple forms.
- Do not mix Lucide with Heroicons, Material Icons, Font Awesome, or other icon libraries.

## 8. Border Radius

| Element | Radius |
| --- | --- |
| Inputs | `12px` |
| Buttons | `14px` |
| Cards | `16px` |
| Dialogs | `24px` |
| Bottom sheets | `28px` |
| Profile images and pills | `999px` or a circle |

## 9. Shadows

Shadows must remain soft and subtle.

| Token | Recommended value | Usage |
| --- | --- | --- |
| `--shadow-card` | `0 2px 8px rgba(10, 18, 32, 0.08)` | Cards |
| `--shadow-floating` | `0 8px 24px rgba(10, 18, 32, 0.14)` | Floating actions |
| `--shadow-sheet` | `0 -10px 40px rgba(10, 18, 32, 0.12)` | Bottom sheets |

## 10. Elevation

| Level | Surface |
| --- | --- |
| 0 | Page background |
| 1 | Cards |
| 2 | Dialogs and sheets |
| 3 | Floating actions |

Use elevation to communicate hierarchy, not decoration.

## 11. Buttons

| Variant | Treatment |
| --- | --- |
| Primary | Blue, filled, rounded, and prominent |
| Secondary | Outlined |
| Tertiary | Text only |
| Danger | Red and reserved for destructive actions |

- Make the primary action visually obvious.
- Show a spinner and preserve the button's width while an action is processing.
- Disable the button during non-repeatable processing.
- Never use tiny buttons; maintain a minimum `44px` touch target.

## 12. Inputs

- Use large touch targets and rounded fields.
- Left-side icons are allowed when they clarify the field.
- Floating labels are optional; persistent labels are preferred when context could be lost.
- Place validation messages directly below their fields.
- Never rely on color alone to indicate validation state.

## 13. Cards

Each card should contain only what its task requires, typically:

- A title
- Supporting information
- One primary action
- Secondary information
- Enough whitespace to establish hierarchy

Never cram information into a card.

## 14. Navigation

### Desktop

- Use top navigation.
- Add a left utility panel only when the workflow genuinely requires it.

### Mobile

- Use bottom navigation.
- Use exactly five tabs when the full primary navigation is present.
- Keep infrequent destinations outside the primary tab bar.

## 15. Motion

Use `150ms`, `200ms`, or `250ms` durations with ease-out timing.

Allowed motion patterns:

- Fade
- Slide
- Scale
- Ripple
- Shimmer

Never use bounce effects. Motion must explain a change, confirm an action, or preserve spatial context.

## 16. Feedback

Every action must produce immediate feedback through the most appropriate pattern:

- Inline state change
- Toast or snackbar
- Progress indicator
- Loading state
- Success confirmation
- Failure message with a recovery action

Never leave an action silent.

## 17. Empty States

Every empty state needs:

- A friendly vector illustration
- One concise sentence
- One primary action

Example:

> No jobs yet.

**Primary action:** Post a Job

## 18. Loading

Use skeletons for content loading. Use a spinner only when a skeleton cannot represent the pending state, such as inside a compact action button.

## 19. Maps

Maps are a defining KAILA feature.

- Use minimal map styling with blue accents.
- Present map information in rounded cards.
- Show a live provider marker when location sharing is active.
- Make ETA and distance prominent.
- Draw provider routes in blue.
- Represent the current location with a blue dot.
- Represent the destination with a blue pin.

## 20. Offer Cards

An offer card must immediately answer:

1. Who is offering?
2. How much will it cost?
3. How soon are they available?
4. Why can the user trust them?

Include:

- Avatar and name
- Rating
- Completed jobs
- Price
- Availability or ETA
- Accept action
- View Details action

## 21. Provider Profile

Provider profiles should include:

- Large avatar
- Verification badges, only when genuinely verified
- Rating and completed-job count
- Portfolio
- Services
- About section
- Reviews
- Service area or map
- One prominent **Hire** action

## 22. Job Status

Use a visual timeline:

1. Posted
2. Offers
3. Selected
4. Traveling
5. Working
6. Completed
7. Rated

Highlight only the current stage. Completed and upcoming stages should remain visually distinct but subordinate.

## 23. Illustrations

- Use friendly, flat, rounded vector illustrations.
- Do not use stock photos as decorative illustrations.
- Do not mix AI-generated people with vector illustration styles.

## 24. Images

Use real user photos only for:

- Provider profiles
- Portfolios
- Job photos

Use vectors for all decorative imagery.

## 25. Dark Mode

Design dark mode independently; do not mechanically invert light mode.

- Use semantic tokens.
- Preserve visual hierarchy and brand recognition.
- Recheck contrast, elevation, maps, imagery, and semantic states in the dark theme.

## 26. Accessibility

- Maintain a minimum `44px` touch target.
- Support keyboard navigation.
- Use high-contrast text and controls.
- Keep content readable outdoors.
- Support large text without breaking layouts.
- Provide visible focus states.
- Use text or icons alongside color for status and validation.

## 27. Sound

Sound is optional and must be subtle. Reserve it for:

- Notifications
- Offer received
- Job accepted
- Provider arrived

Do not add sound to routine navigation or decorative interactions. Respect device and user preferences.

## 28. Component Library

### Foundations

- Color, spacing, radius, shadow, typography, and motion tokens
- Typography
- Icons

### Navigation

- Top navigation
- Bottom navigation
- Floating action button
- Tabs
- Drawer

### Inputs and Actions

- Buttons
- Inputs
- Search
- Filters

### Overlays and Feedback

- Dialogs
- Bottom sheets
- Toasts and snackbars
- Loading indicators
- Skeletons
- Progress indicators

### Marketplace

- Provider card
- Job card
- Offer card
- Review card
- Status badge
- Timeline

### Profile and Messaging

- Avatar
- Verification badges
- Chat bubble
- Attachment
- Photo grid
- Notification item

### Maps

- Map container
- Markers
- Route card
- ETA card

### Data Display

- Cards
- Lists
- Tables, for desktop workflows only when a list or card view would not be clearer

## 29. Responsive Breakpoints

| Breakpoint | Range |
| --- | --- |
| `xs` | `0-479px` |
| `sm` | `480-767px` |
| `md` | `768-1023px` |
| `lg` | `1024-1439px` |
| `xl` | `1440px` and above |

Always design mobile first. Expand layouts as space becomes available; do not merely scale mobile controls upward.

## 30. Design Tokens

Every color, spacing value, radius, shadow, font, and motion value must come from a design token. Never hardcode these values inside components.

Example token names:

```css
--color-primary
--color-surface
--radius-card
--shadow-card
--spacing-16
--font-body
--duration-fast
```

Tokens should describe purpose rather than a specific screen or component whenever possible.

## 31. Microinteractions

Provide a satisfying but subtle animation or confirmation when a user:

- Posts a job
- Receives an offer
- Accepts an offer
- Sees a provider start traveling
- Sees a provider arrive
- Completes work
- Releases payment
- Submits a review

Microinteractions must reinforce state changes and must not delay the task.

## 32. KAILA's Unique Design Language

KAILA should not feel like another generic marketplace. Its visual language comes from the logo's map pin, tools, and idea of local movement.

### Route-Inspired Accents

Use gentle curved lines and subtle route motifs in onboarding, empty states, and hero banners to express connection between people and services. Keep them secondary to content.

### Contextual Service Colors

Keep blue and cyan as the core identity. Service categories may use small, tokenized accent colors for quicker recognition, but category colors must never replace the KAILA palette or carry meaning without a label or icon.

### Location-First Visuals

Show distance, ETA, service area, and neighborhood context prominently when relevant. KAILA is about nearby help.

### Confidence Through Transparency

Cards should communicate who, where, when, and how much without forcing users to open another screen for essential information.

### Human-First Layouts

Emphasize real provider faces, ratings, reviews, and portfolios where available. Real people and real work establish trust more effectively than decorative graphics.

## Design Review Checklist

Before approving a screen, verify that:

- It has one clear purpose and one obvious primary action.
- It uses design tokens and reusable KAILA components.
- It remains recognizable as KAILA when the logo is hidden.
- It presents location, trust, price, and timing clearly when relevant.
- It has loading, empty, error, success, and disabled states as applicable.
- Every action provides feedback.
- It works from `xs` through `xl` breakpoints.
- It supports keyboard use, large text, dark mode, and minimum touch targets.
- Its motion is subtle, purposeful, and between `150ms` and `250ms`.
- It avoids dashboard-like density and unnecessary decoration.
