# 6. Design system

Tokens live in `src/index.css` (`@theme`). Components in `src/components/ui/`.

## Idea
Student-friendly but not childish. Calm violet, plenty of white, numbers set
large in a characterful font. One signature element — the **720 track** on Home —
and everything else stays quiet.

## Colour
| Token | Hex | Use |
|-------|-----|-----|
| `brand-600` | `#5B3FD9` | Primary actions, score panel, active nav |
| `sky` | `#1E9BD7` | Secondary info (countdown, "reviewing") |
| `paper` | `#F6F5FB` | Page background (cool off-white) |
| `ink` | `#1E1A36` | Text, dark preview panels |
| `good` / `warn` / `bad` | green / amber / red | Success, gentle warnings, errors only |
| `phy` | `#0F8FD1` | Physics — everywhere |
| `chem` | `#D98A0B` | Chemistry — everywhere |
| `bio` | `#1A9A4B` | Biology — everywhere |

Red is for errors and incorrect answers only — never for "low score".

## Type
- **Bricolage Grotesque** — headings and big numbers.
- **Inter** — everything else.
- Numbers use tabular figures (`.tabular`) so columns line up.

## Shape
Radii by importance: panels 22px → subject cards 18px → controls 12px → chips (pill).
Borders instead of heavy shadows.

## Components
`Button` (primary / secondary / ghost / danger), `Panel`, `PageHeader`,
`TextField`, `SelectField`, `TextArea`, `Stepper` (+/−), `Rating` (1–5),
`Segmented`, `Chip`, `EmptyState`, `ErrorState`, `LoadingBlock`, `NotEnoughData`, toasts.

## Writing rules
- Sentence case, plain verbs. Buttons say what happens: "Save test", "Log it".
- Never "weak", "poor", "failed". Use "to review", "coming up again", "worth a look".
- One test is never a trend. Show "not enough data yet" instead of guessing.
- Errors say what happened and how to fix it.

## Accessibility
Labels on every input, visible focus ring, keyboard-usable dialogs (native
`<dialog>`), contrast ≥ 4.5:1 for text, reduced-motion respected, 44px touch targets.
