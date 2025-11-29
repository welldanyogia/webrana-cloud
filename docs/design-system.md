# WeBrana Cloud Design System (v1.3)

**Status**: Active
**Version**: 1.0
**Target Platform**: Web (Customer Portal & Admin Dashboard)
**Tech Stack**: Tailwind CSS v4 + Shadcn UI

---

## 1. Design Philosophy

WeBrana Cloud aims for a **"Developer-Native"** aesthetic. It should feel like a precision tool—fast, clean, and unobtrusive.

*   **Inspiration**: Vercel (Minimalism), DigitalOcean (Friendliness), Linear (Precision).
*   **Core Principles**:
    *   **Content First**: High whitespace, subtle dividers.
    *   **Function over Flash**: Standard patterns, predictable interactions.
    *   **Speed**: Optimistic UI, fast transitions, clear feedback.
    *   **Accessibility**: WCAG AA compliant contrast, keyboard navigation ready.

---

## 2. Design Tokens

### 2.1 Color Palette

We use a **Zinc** neutral base for a clean, modern look (avoiding the blue-tint of Slate or the warmth of Stone), paired with an **Indigo** primary brand color.

#### Primitives (Tailwind Reference)

| Role | Color Family | Hex (approx) | Usage |
| :--- | :--- | :--- | :--- |
| **Neutral** | `Zinc` (50-950) | `#FAFAFA` - `#09090B` | Backgrounds, Text, Borders |
| **Brand** | `Indigo` (50-950) | `#4F46E5` (600) | Primary Actions, Active States |
| **Success** | `Emerald` (50-950) | `#10B981` (500) | Status: Active, Operational |
| **Warning** | `Amber` (50-950) | `#F59E0B` (500) | Status: Pending, Warning |
| **Error** | `Red` (50-950) | `#EF4444` (500) | Status: Failed, Deleted, Destructive |

#### Semantic Mapping (Dark/Light Mode)

| Semantic Token | Light Mode (Tailwind) | Dark Mode (Tailwind) | Description |
| :--- | :--- | :--- | :--- |
| `background` | `white` | `zinc-950` | Page background |
| `foreground` | `zinc-950` | `zinc-50` | Primary text |
| `card` | `white` | `zinc-950` | Card background |
| `card-foreground` | `zinc-950` | `zinc-50` | Card text |
| `popover` | `white` | `zinc-950` | Dropdowns, Modals |
| `primary` | `zinc-900` | `zinc-50` | Main CTAs (High contrast) |
| `primary-foreground`| `zinc-50` | `zinc-900` | Text on primary |
| `secondary` | `zinc-100` | `zinc-800` | Secondary actions |
| `muted` | `zinc-100` | `zinc-800` | Disabled, tertiary backgrounds |
| `muted-foreground`| `zinc-500` | `zinc-400` | Subtitles, hints |
| `accent` | `zinc-100` | `zinc-800` | Hover states |
| `border` | `zinc-200` | `zinc-800` | Hairline borders |
| **`brand`** | `indigo-600` | `indigo-500` | **Brand highlight color** |

### 2.2 Typography

#### Font Stack
*   **Sans (UI)**: `Inter`, system-ui, sans-serif. (Clean, legible).
*   **Mono (Code/IDs)**: `JetBrains Mono`, `Geist Mono`, monospace. (For IP addresses, Server IDs, Logs).

#### Type Scale

| Role | Size (Tailwind) | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **H1** | `text-3xl` | Bold (700) | Page Titles |
| **H2** | `text-2xl` | Semibold (600) | Section Headers |
| **H3** | `text-xl` | Semibold (600) | Card Titles |
| **H4** | `text-lg` | Medium (500) | Sub-sections |
| **Body** | `text-sm` | Regular (400) | Standard UI text |
| **Small** | `text-xs` | Regular (400) | Metadata, labels |
| **Mono** | `text-sm` | Regular (400) | IP Addresses, SSH Keys |

### 2.3 Radius & Spacing

*   **Radius**: `0.5rem` (8px). Matches Shadcn default `rounded-md`. Friendly but professional.
*   **Spacing**: 4pt grid system.
    *   `gap-4` (16px): Standard component spacing.
    *   `p-6` (24px): Card padding.
    *   `px-4 py-2` (16px / 8px): Standard button padding.

---

## 3. Component Guidelines

### 3.1 Buttons
*   **Primary**: High contrast (Black/White). `bg-primary text-primary-foreground`.
*   **Secondary**: Outline or light gray. `bg-secondary text-secondary-foreground`.
*   **Brand**: Used sparingly for "Create" actions. `bg-indigo-600 text-white hover:bg-indigo-700`.
*   **Ghost**: For table actions/icons. `hover:bg-accent`.
*   **Destructive**: Red. `bg-destructive text-destructive-foreground`.

### 3.2 Cards (The "Surface")
*   **Style**: Minimalist "Linear" style.
*   **Border**: `border border-zinc-200 dark:border-zinc-800`.
*   **Shadow**: `shadow-sm` (Subtle) or `shadow-none` (Flat).
*   **Header**: Clear title + optional action on right.
*   **Usage**: Used for Resource Lists, Forms, and Summary Boxes.

### 3.3 Inputs
*   **Style**: Simple, precise borders.
*   **Height**: `h-9` (36px) for compact, `h-10` (40px) for standard.
*   **Focus Ring**: `ring-2 ring-indigo-500/20 border-indigo-500`.
*   **Labels**: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`.

### 3.4 Navigation
*   **Sidebar (App)**: Dark or Light specific. Collapsible icons.
*   **Breadcrumbs**: Essential for deep navigation (e.g., `Droplets / web-prod-01 / Settings`).

---

## 4. Implementation Guide (Frontend)

### 4.1 Tailwind Config (`tailwind.config.js` or v4 CSS)

Ensure the font family is configured:

```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ["var(--font-sans)", ...fontFamily.sans],
      mono: ["var(--font-mono)", ...fontFamily.mono],
    },
    colors: {
      // Add brand color if not using css variables for everything
      brand: {
        50: '#eef2ff',
        // ...
        600: '#4f46e5', // Primary Brand
        // ...
        950: '#312e81',
      }
    }
  }
}
```

### 4.2 CSS Variables (`globals.css`)

Use these base values for the **Zinc** theme:

```css
@layer base {
  :root {
    /* Zinc Light */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    /* Zinc Dark */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}
```
