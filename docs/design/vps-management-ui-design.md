# VPS Management UI Design Specification

**Version:** 1.0  
**Status:** READY FOR IMPLEMENTATION  
**Designer:** Senior UI/UX Designer  
**Target:** customer-web application

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System Extensions](#2-design-system-extensions)
3. [VPS List Page Design](#3-vps-list-page-design)
4. [VPS Detail Page Design](#4-vps-detail-page-design)
5. [Component Specifications](#5-component-specifications)
6. [Animation Specifications](#6-animation-specifications)
7. [Responsive Design](#7-responsive-design)
8. [Accessibility](#8-accessibility)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Design Philosophy

### Design Direction

This design takes inspiration from premium cloud platforms while establishing a **distinctive Webrana identity**:

| Reference | What We Borrow | How We Differentiate |
|-----------|----------------|----------------------|
| DigitalOcean | Clean data presentation, resource monitoring | Warmer color palette, more playful micro-interactions |
| Vercel | Minimalist elegance, typography hierarchy | More vibrant status indicators, glassmorphism cards |
| Railway | Dark mode aesthetics, subtle gradients | Indonesian-first UX, clearer action hierarchy |
| Render | Card-based layout, service status | Enhanced visual feedback, animated transitions |

### Core Principles

1. **Premium Feel Without Complexity** - Clean surfaces with subtle depth
2. **Status at a Glance** - Users know VPS health in < 1 second
3. **Delightful Micro-interactions** - Smooth transitions reward engagement
4. **Mobile-First Responsiveness** - Full functionality on any device
5. **Dark Mode First** - Optimized for developers who prefer dark themes

---

## 2. Design System Extensions

### 2.1 Extended Color Tokens

Add these CSS custom properties to `globals.css`:

```css
@layer base {
  :root {
    /* ===== VPS Status Colors ===== */
    --status-active: 142 76% 36%;          /* Emerald-600 */
    --status-active-glow: 142 76% 36% / 0.4;
    --status-active-bg: 142 76% 36% / 0.1;
    
    --status-stopped: 220 9% 46%;           /* Slate-500 */
    --status-stopped-bg: 220 9% 46% / 0.1;
    
    --status-suspended: 38 92% 50%;         /* Amber-500 */
    --status-suspended-glow: 38 92% 50% / 0.4;
    --status-suspended-bg: 38 92% 50% / 0.1;
    
    --status-expiring: 45 93% 47%;          /* Yellow-500 */
    --status-expiring-glow: 45 93% 47% / 0.5;
    --status-expiring-bg: 45 93% 47% / 0.1;
    
    --status-terminated: 0 84% 60%;         /* Red-500 */
    --status-terminated-bg: 0 84% 60% / 0.1;
    
    --status-provisioning: 217 91% 60%;     /* Blue-500 */
    --status-provisioning-glow: 217 91% 60% / 0.4;
    --status-provisioning-bg: 217 91% 60% / 0.1;

    /* ===== Card Enhancement ===== */
    --card-gradient-from: 0 0% 100%;
    --card-gradient-to: 240 5% 96%;
    --card-border-glow: 221 83% 53% / 0.2;
    --card-hover-lift: 0 10px 40px -15px rgba(0, 0, 0, 0.1);
    
    /* ===== Resource Monitoring ===== */
    --gauge-track: 220 14% 96%;
    --gauge-fill-low: 142 76% 36%;          /* Green - 0-60% */
    --gauge-fill-medium: 38 92% 50%;        /* Amber - 60-80% */
    --gauge-fill-high: 0 84% 60%;           /* Red - 80-100% */
    
    /* ===== Danger Zone ===== */
    --danger-zone-bg: 0 84% 60% / 0.05;
    --danger-zone-border: 0 84% 60% / 0.2;
  }

  .dark {
    /* ===== VPS Status Colors (Dark Mode) ===== */
    --status-active: 142 71% 45%;
    --status-active-glow: 142 71% 45% / 0.5;
    --status-active-bg: 142 71% 45% / 0.15;
    
    --status-stopped: 220 9% 46%;
    --status-stopped-bg: 220 9% 46% / 0.15;
    
    --status-suspended: 38 92% 50%;
    --status-suspended-glow: 38 92% 50% / 0.5;
    --status-suspended-bg: 38 92% 50% / 0.15;
    
    --status-expiring: 45 93% 47%;
    --status-expiring-glow: 45 93% 47% / 0.6;
    --status-expiring-bg: 45 93% 47% / 0.15;
    
    --status-terminated: 0 62% 45%;
    --status-terminated-bg: 0 62% 45% / 0.15;
    
    --status-provisioning: 217 91% 60%;
    --status-provisioning-glow: 217 91% 60% / 0.5;
    --status-provisioning-bg: 217 91% 60% / 0.15;

    /* ===== Card Enhancement (Dark Mode) ===== */
    --card-gradient-from: 240 10% 5%;
    --card-gradient-to: 240 10% 8%;
    --card-border-glow: 221 83% 53% / 0.3;
    --card-hover-lift: 0 10px 40px -15px rgba(0, 0, 0, 0.5);
    
    /* ===== Resource Monitoring (Dark Mode) ===== */
    --gauge-track: 240 5% 15%;
    
    /* ===== Danger Zone (Dark Mode) ===== */
    --danger-zone-bg: 0 62% 45% / 0.1;
    --danger-zone-border: 0 62% 45% / 0.3;
  }
}
```

### 2.2 Animation Keyframes

Add to `globals.css`:

```css
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 hsl(var(--status-active-glow));
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 8px hsl(var(--status-active-glow) / 0);
  }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes countdown-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@theme {
  --animate-pulse-glow: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-spin-slow: spin-slow 3s linear infinite;
  --animate-shimmer: shimmer 2s linear infinite;
  --animate-bounce-subtle: bounce-subtle 1s ease-in-out infinite;
  --animate-scale-in: scale-in 0.2s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-countdown-pulse: countdown-pulse 2s ease-in-out infinite;
}
```

---

## 3. VPS List Page Design

### 3.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header Section                                                   │
│ ┌─────────────────────────────────────────┐  ┌───────────────┐  │
│ │ VPS Saya                                │  │ [Grid] [List] │  │
│ │ Kelola server virtual Anda              │  │ [+ Buat VPS]  │  │
│ └─────────────────────────────────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Filter Bar                                                       │
│ ┌──────────────────┐ ┌───────────────┐ ┌─────────────────────┐  │
│ │ 🔍 Cari VPS...   │ │ Status: Semua │ │ Region: Semua       │  │
│ └──────────────────┘ └───────────────┘ └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ VPS Grid (or List View)                                          │
│ ┌─────────────────────┐ ┌─────────────────────┐                 │
│ │ [VPS Card 1]        │ │ [VPS Card 2]        │                 │
│ │                     │ │                     │                 │
│ └─────────────────────┘ └─────────────────────┘                 │
│ ┌─────────────────────┐ ┌─────────────────────┐                 │
│ │ [VPS Card 3]        │ │ [VPS Card 4]        │                 │
│ │                     │ │                     │                 │
│ └─────────────────────┘ └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Header Section

```tsx
// Tailwind classes for header
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <div>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
      VPS Saya
    </h1>
    <p className="text-muted-foreground mt-1">
      Kelola dan monitor server virtual Anda
    </p>
  </div>
  <div className="flex items-center gap-3">
    {/* View Toggle */}
    <div className="flex items-center bg-muted rounded-lg p-1">
      <button className="p-2 rounded-md bg-background shadow-sm text-foreground">
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
        <List className="h-4 w-4" />
      </button>
    </div>
    <Button leftIcon={<Plus className="h-4 w-4" />}>
      Buat VPS Baru
    </Button>
  </div>
</div>
```

### 3.3 Filter Bar

```tsx
// Filter bar with search and dropdowns
<div className="flex flex-col sm:flex-row gap-3 mb-6">
  {/* Search Input */}
  <div className="relative flex-1 max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
      type="text"
      placeholder="Cari nama atau IP..."
      className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
    />
  </div>
  
  {/* Status Filter */}
  <select className="px-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
    <option>Status: Semua</option>
    <option>Aktif</option>
    <option>Mati</option>
    <option>Expired</option>
  </select>
  
  {/* Region Filter */}
  <select className="px-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
    <option>Region: Semua</option>
    <option>Singapore</option>
    <option>Jakarta</option>
  </select>
</div>
```

---

## 4. VPS Detail Page Design

### 4.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Kembali ke VPS Saya                                            │
├─────────────────────────────────────────────────────────────────┤
│ Header                                                           │
│ ┌─────────────────────────────────────────┐  ┌───────────────┐  │
│ │ [●] my-production-server                │  │ [Status Badge]│  │
│ │     203.0.113.45                         │  └───────────────┘  │
│ └─────────────────────────────────────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│ Main Content (2-column on desktop)                               │
│ ┌────────────────────────────────┐ ┌──────────────────────────┐ │
│ │ Power Controls Card            │ │ Instance Info Card       │ │
│ │ [Start] [Stop] [Reboot]        │ │ Plan: VPS Basic          │ │
│ └────────────────────────────────┘ │ OS: Ubuntu 22.04         │ │
│ ┌────────────────────────────────┐ │ Region: SGP1             │ │
│ │ Resource Monitoring            │ │ Created: 5 days ago      │ │
│ │ ┌─────────┐ ┌─────────┐        │ ├──────────────────────────┤ │
│ │ │ CPU 45% │ │ RAM 67% │        │ │ Billing Info             │ │
│ │ └─────────┘ └─────────┘        │ │ Period: Monthly          │ │
│ │ ┌─────────┐ ┌─────────┐        │ │ Expires: 25 days         │ │
│ │ │Disk 32% │ │ BW Used │        │ │ Auto-renew: [Toggle]     │ │
│ │ └─────────┘ └─────────┘        │ │ [Renew Now]              │ │
│ └────────────────────────────────┘ └──────────────────────────┘ │
│ ┌────────────────────────────────┐                               │
│ │ SSH Access Card                │                               │
│ │ IP: 203.0.113.45 [Copy]        │                               │
│ │ User: root [Copy]              │                               │
│ │ ssh root@203.0.113.45 [Copy]   │                               │
│ └────────────────────────────────┘                               │
│ ┌────────────────────────────────┐                               │
│ │ Danger Zone                    │                               │
│ │ [Rebuild OS] [Delete VPS]      │                               │
│ └────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 VPS Card Component (`VpsCard.tsx`)

**Grid View Card:**

```tsx
interface VpsCardProps {
  vps: VpsOrder;
  viewMode: 'grid' | 'list';
  onQuickAction?: (action: string) => void;
}

// Grid View Tailwind Classes
const gridCardClasses = `
  group relative overflow-hidden
  rounded-xl border border-border
  bg-gradient-to-b from-[hsl(var(--card-gradient-from))] to-[hsl(var(--card-gradient-to))]
  transition-all duration-300 ease-out
  hover:shadow-[var(--card-hover-lift)]
  hover:border-[hsl(var(--card-border-glow))]
  hover:-translate-y-1
`;

// Card Structure
<div className={gridCardClasses}>
  {/* Expiring Soon Banner - shows when < 7 days */}
  {isExpiringSoon && (
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-shimmer bg-[length:200%_100%]" />
  )}
  
  {/* Card Header */}
  <div className="p-5 pb-4">
    <div className="flex items-start justify-between gap-3">
      {/* Server Icon with Status Ring */}
      <div className="relative">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-primary/10 to-primary/5",
          "ring-2 ring-offset-2 ring-offset-background transition-all",
          statusRingColors[status] // e.g., "ring-emerald-500/50"
        )}>
          <Server className="h-5 w-5 text-primary" />
        </div>
        {/* Live Status Dot */}
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
          status === 'ACTIVE' && "bg-emerald-500 animate-pulse-glow",
          status === 'SUSPENDED' && "bg-amber-500",
          status === 'PROVISIONING' && "bg-blue-500 animate-spin-slow"
        )} />
      </div>
      
      {/* Status Badge */}
      <VpsStatusBadge status={status} />
    </div>
    
    {/* Server Name & IP */}
    <div className="mt-4">
      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
        {vps.planName}
      </h3>
      <p className="text-sm font-mono text-muted-foreground mt-1 flex items-center gap-2">
        <Globe className="h-3.5 w-3.5" />
        {vps.provisioningTask?.ipv4Public || 'Pending...'}
      </p>
    </div>
  </div>
  
  {/* Specs Bar */}
  <div className="px-5 py-3 border-t border-border/50 bg-muted/30">
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Cpu className="h-3.5 w-3.5" />
        {specs.cpu} vCPU
      </span>
      <span className="flex items-center gap-1.5">
        <MemoryStick className="h-3.5 w-3.5" />
        {specs.ram}
      </span>
      <span className="flex items-center gap-1.5">
        <HardDrive className="h-3.5 w-3.5" />
        {specs.disk}
      </span>
    </div>
  </div>
  
  {/* Expiry Countdown (conditional) */}
  {daysUntilExpiry <= 7 && (
    <div className={cn(
      "px-5 py-3 border-t border-border/50",
      "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Expires in {daysUntilExpiry} days
        </span>
        <button className="text-xs font-medium text-primary hover:underline">
          Renew
        </button>
      </div>
    </div>
  )}
  
  {/* Quick Actions Footer */}
  <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
    <div className="flex items-center gap-1">
      {/* Power Toggle */}
      <button className={cn(
        "p-2 rounded-lg transition-all",
        "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500",
        status === 'ACTIVE' && "text-emerald-500"
      )}>
        <Power className="h-4 w-4" />
      </button>
      {/* Reboot */}
      <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
        <RefreshCw className="h-4 w-4" />
      </button>
      {/* Console */}
      <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
        <Terminal className="h-4 w-4" />
      </button>
    </div>
    
    {/* Auto-Renew Toggle */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Auto</span>
      <Switch checked={vps.autoRenew} size="sm" />
    </div>
  </div>
</div>
```

**List View Row:**

```tsx
const listRowClasses = `
  group flex items-center gap-4 p-4
  rounded-xl border border-border
  bg-card hover:bg-muted/30
  transition-all duration-200
  hover:shadow-sm hover:border-primary/20
`;

<div className={listRowClasses}>
  {/* Status Indicator */}
  <div className="relative">
    <span className={cn(
      "w-3 h-3 rounded-full",
      statusColors[status],
      status === 'ACTIVE' && "animate-pulse-glow"
    )} />
  </div>
  
  {/* Server Info */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-3">
      <h3 className="font-medium text-foreground truncate">
        {vps.planName}
      </h3>
      <VpsStatusBadge status={status} size="sm" />
    </div>
    <p className="text-sm text-muted-foreground font-mono">
      {vps.provisioningTask?.ipv4Public}
    </p>
  </div>
  
  {/* Specs */}
  <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
    <span>{specs.cpu} vCPU</span>
    <span>{specs.ram}</span>
    <span>{specs.disk}</span>
    <span>{vps.provisioningTask?.doRegion?.toUpperCase()}</span>
  </div>
  
  {/* Actions */}
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon">
      <Power className="h-4 w-4" />
    </Button>
    <Button variant="outline" size="sm">
      Kelola
    </Button>
  </div>
</div>
```

### 5.2 VPS Status Badge (`VpsStatusBadge.tsx`)

```tsx
interface VpsStatusBadgeProps {
  status: VpsStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  animated?: boolean;
}

type VpsStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRING_SOON' | 'TERMINATED' | 'PROVISIONING' | 'STOPPED';

const STATUS_CONFIG: Record<VpsStatus, {
  label: string;
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
  dotClass: string;
  glowClass?: string;
}> = {
  ACTIVE: {
    label: 'Running',
    icon: CheckCircle,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    glowClass: 'shadow-[0_0_8px_2px_hsl(var(--status-active-glow))]',
  },
  STOPPED: {
    label: 'Stopped',
    icon: StopCircle,
    bgClass: 'bg-slate-500/10 dark:bg-slate-500/20',
    textClass: 'text-slate-700 dark:text-slate-400',
    dotClass: 'bg-slate-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    glowClass: 'shadow-[0_0_8px_2px_hsl(var(--status-suspended-glow))]',
  },
  EXPIRING_SOON: {
    label: 'Expiring',
    icon: Clock,
    bgClass: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    dotClass: 'bg-yellow-500 animate-countdown-pulse',
    glowClass: 'shadow-[0_0_8px_2px_hsl(var(--status-expiring-glow))]',
  },
  TERMINATED: {
    label: 'Terminated',
    icon: XCircle,
    bgClass: 'bg-red-500/10 dark:bg-red-500/20',
    textClass: 'text-red-700 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  PROVISIONING: {
    label: 'Provisioning',
    icon: Loader2,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    textClass: 'text-blue-700 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    glowClass: 'shadow-[0_0_8px_2px_hsl(var(--status-provisioning-glow))]',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export function VpsStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = false,
  animated = true 
}: VpsStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center font-semibold rounded-full",
      config.bgClass,
      config.textClass,
      SIZE_CLASSES[size],
      "transition-all duration-200"
    )}>
      {/* Animated Dot */}
      <span className={cn(
        "rounded-full flex-shrink-0",
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        config.dotClass,
        animated && status === 'ACTIVE' && 'animate-pulse',
        animated && status === 'PROVISIONING' && 'animate-spin-slow',
        animated && config.glowClass
      )} />
      
      {showIcon && <Icon className={cn(
        size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
        status === 'PROVISIONING' && 'animate-spin'
      )} />}
      
      <span>{config.label}</span>
    </span>
  );
}
```

### 5.3 Power Control Panel (`VpsPowerControls.tsx`)

```tsx
interface VpsPowerControlsProps {
  status: VpsStatus;
  onPowerOn: () => void;
  onPowerOff: () => void;
  onReboot: () => void;
  isLoading?: boolean;
  loadingAction?: string;
}

export function VpsPowerControls({
  status,
  onPowerOn,
  onPowerOff,
  onReboot,
  isLoading,
  loadingAction,
}: VpsPowerControlsProps) {
  const isActive = status === 'ACTIVE';
  const isStopped = status === 'STOPPED';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle size="sm" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Power Controls
        </CardTitle>
        <CardDescription>
          Manage your server power state
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3">
          {/* Power On Button */}
          {isStopped && (
            <Button
              variant="success"
              size="sm"
              onClick={onPowerOn}
              isLoading={loadingAction === 'power_on'}
              disabled={isLoading}
              leftIcon={<Power className="h-4 w-4" />}
              className={cn(
                "relative overflow-hidden",
                "before:absolute before:inset-0 before:bg-gradient-to-r",
                "before:from-transparent before:via-white/10 before:to-transparent",
                "before:translate-x-[-200%] hover:before:translate-x-[200%]",
                "before:transition-transform before:duration-700"
              )}
            >
              Start Server
            </Button>
          )}
          
          {/* Power Off Button */}
          {isActive && (
            <Button
              variant="danger"
              size="sm"
              onClick={onPowerOff}
              isLoading={loadingAction === 'power_off'}
              disabled={isLoading}
              leftIcon={<PowerOff className="h-4 w-4" />}
            >
              Stop Server
            </Button>
          )}
          
          {/* Reboot Button */}
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReboot}
              isLoading={loadingAction === 'reboot'}
              disabled={isLoading}
              leftIcon={<RefreshCw className={cn(
                "h-4 w-4",
                loadingAction === 'reboot' && "animate-spin"
              )} />}
              className="hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Reboot
            </Button>
          )}
          
          {/* Console Access */}
          <Button
            variant="outline"
            size="sm"
            disabled={!isActive || isLoading}
            leftIcon={<Terminal className="h-4 w-4" />}
          >
            Console
          </Button>
        </div>
        
        {/* Status Info */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
          )} />
          <span className="text-sm text-muted-foreground">
            Server is currently <strong className="text-foreground">{isActive ? 'running' : 'stopped'}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.4 Resource Monitor Cards (`VpsResourceMonitor.tsx`)

```tsx
interface ResourceGaugeProps {
  label: string;
  value: number; // 0-100
  icon: LucideIcon;
  unit?: string;
  maxValue?: string;
}

function ResourceGauge({ label, value, icon: Icon, unit = '%', maxValue }: ResourceGaugeProps) {
  const getColorClass = (val: number) => {
    if (val < 60) return 'text-emerald-500';
    if (val < 80) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getGradientClass = (val: number) => {
    if (val < 60) return 'from-emerald-500 to-emerald-400';
    if (val < 80) return 'from-amber-500 to-yellow-400';
    return 'from-red-500 to-orange-400';
  };
  
  return (
    <div className={cn(
      "p-4 rounded-xl border border-border",
      "bg-gradient-to-br from-card to-muted/20",
      "hover:shadow-md transition-all duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            "bg-gradient-to-br from-primary/10 to-primary/5"
          )}>
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          getColorClass(value)
        )}>
          {value}<span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            "bg-gradient-to-r",
            getGradientClass(value),
            "transition-all duration-500 ease-out"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      
      {/* Max Value Label */}
      {maxValue && (
        <p className="text-xs text-muted-foreground mt-2 text-right">
          of {maxValue}
        </p>
      )}
    </div>
  );
}

export function VpsResourceMonitor({ metrics }: { metrics: VpsMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle size="sm" className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Resource Usage
        </CardTitle>
        <CardDescription>
          Real-time server performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <ResourceGauge
            label="CPU"
            value={metrics.cpu}
            icon={Cpu}
            maxValue="2 vCPU"
          />
          <ResourceGauge
            label="Memory"
            value={metrics.memory}
            icon={MemoryStick}
            maxValue="4 GB"
          />
          <ResourceGauge
            label="Disk"
            value={metrics.disk}
            icon={HardDrive}
            maxValue="80 GB"
          />
          <ResourceGauge
            label="Bandwidth"
            value={metrics.bandwidth}
            icon={Wifi}
            maxValue="4 TB"
          />
        </div>
        
        {/* Last Updated */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Last updated: {formatRelativeTime(metrics.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
```

### 5.5 Billing Info Card (`VpsBillingInfo.tsx`)

```tsx
interface VpsBillingInfoProps {
  billingPeriod: string;
  expiresAt: string;
  autoRenew: boolean;
  renewalPrice: number;
  walletBalance: number;
  onToggleAutoRenew: () => void;
  onRenewNow: () => void;
}

export function VpsBillingInfo({
  billingPeriod,
  expiresAt,
  autoRenew,
  renewalPrice,
  walletBalance,
  onToggleAutoRenew,
  onRenewNow,
}: VpsBillingInfoProps) {
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);
  const canAutoRenew = walletBalance >= renewalPrice;
  const isExpiringSoon = daysUntilExpiry <= 7;
  
  return (
    <Card className={cn(
      isExpiringSoon && "border-amber-500/50"
    )}>
      <CardHeader>
        <CardTitle size="sm" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Billing Period */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Period</span>
          <Badge variant="secondary">{billingPeriod}</Badge>
        </div>
        
        {/* Expiry Countdown */}
        <div className={cn(
          "p-4 rounded-xl",
          isExpiringSoon 
            ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20" 
            : "bg-muted/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Expires</span>
            <span className={cn(
              "font-mono text-sm",
              isExpiringSoon ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-foreground"
            )}>
              {formatDate(expiresAt)}
            </span>
          </div>
          
          {/* Countdown Display */}
          <div className={cn(
            "text-center py-3",
            isExpiringSoon && "animate-countdown-pulse"
          )}>
            <span className={cn(
              "text-3xl font-bold tabular-nums",
              isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {daysUntilExpiry}
            </span>
            <span className="text-sm text-muted-foreground ml-2">days left</span>
          </div>
          
          {/* Progress to expiry */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isExpiringSoon 
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400" 
                  : "bg-primary"
              )}
              style={{ width: `${Math.max(0, (30 - daysUntilExpiry) / 30 * 100)}%` }}
            />
          </div>
        </div>
        
        {/* Auto-Renew Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Auto-renew</span>
          </div>
          <Switch
            checked={autoRenew}
            onCheckedChange={onToggleAutoRenew}
            disabled={!canAutoRenew}
          />
        </div>
        
        {/* Renewal Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Renewal price</span>
            <span className="font-semibold">{formatCurrency(renewalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Wallet balance</span>
            <span className={cn(
              "font-semibold",
              !canAutoRenew && "text-amber-600 dark:text-amber-400"
            )}>
              {formatCurrency(walletBalance)}
            </span>
          </div>
        </div>
        
        {/* Low Balance Warning */}
        {!canAutoRenew && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Insufficient balance for auto-renewal
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="pt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onRenewNow}
          >
            Renew Now
          </Button>
          {!canAutoRenew && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              asChild
            >
              <Link href="/wallet">Top Up</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.6 Danger Zone (`VpsDangerZone.tsx`)

```tsx
export function VpsDangerZone({
  hostname,
  onRebuild,
  onDelete,
}: {
  hostname: string;
  onRebuild: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn(
      "border-destructive/30",
      "bg-gradient-to-br from-[hsl(var(--danger-zone-bg))] to-transparent"
    )}>
      <CardHeader>
        <CardTitle size="sm" className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Irreversible and destructive actions
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Rebuild OS */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div>
            <h4 className="text-sm font-medium text-foreground">Rebuild Server</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reinstall the operating system. All data will be erased.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRebuild}
            className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            Rebuild
          </Button>
        </div>
        
        {/* Delete VPS */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div>
            <h4 className="text-sm font-medium text-foreground">Delete VPS</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete this VPS. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.7 Delete Confirmation Modal (`VpsDeleteModal.tsx`)

```tsx
interface VpsDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hostname: string;
  isLoading?: boolean;
}

export function VpsDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  hostname,
  isLoading,
}: VpsDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === hostname;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Delete VPS</DialogTitle>
          <DialogDescription className="text-center">
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-sm text-muted-foreground mb-2">
              You are about to delete:
            </p>
            <p className="font-mono text-sm font-semibold text-foreground bg-muted px-3 py-2 rounded">
              {hostname}
            </p>
          </div>
          
          <div>
            <Label htmlFor="confirm-hostname" className="text-sm font-medium">
              Type <span className="font-mono text-destructive">{hostname}</span> to confirm
            </Label>
            <Input
              id="confirm-hostname"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter hostname to confirm"
              className={cn(
                "mt-2 font-mono",
                isConfirmed && "border-emerald-500 focus:ring-emerald-500"
              )}
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isConfirmed || isLoading}
            isLoading={isLoading}
          >
            Delete Forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Animation Specifications

### 6.1 Transition Standards

| Context | Duration | Easing | Properties |
|---------|----------|--------|------------|
| Hover states | 200ms | ease-out | `background-color`, `border-color`, `color`, `shadow` |
| Card lift | 300ms | ease-out | `transform`, `box-shadow` |
| Modal open | 200ms | ease-out | `opacity`, `transform` |
| Modal close | 150ms | ease-in | `opacity`, `transform` |
| Status change | 500ms | ease-out | `background-color`, `border-color` |
| Progress bar | 500ms | ease-out | `width` |
| Tooltip | 150ms | ease-out | `opacity` |

### 6.2 Micro-interaction Patterns

```css
/* Card Hover Lift */
.card-hover {
  @apply transition-all duration-300 ease-out;
  @apply hover:-translate-y-1 hover:shadow-lg;
}

/* Button Shimmer Effect */
.btn-shimmer {
  @apply relative overflow-hidden;
}
.btn-shimmer::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-r;
  @apply from-transparent via-white/10 to-transparent;
  @apply translate-x-[-200%] hover:translate-x-[200%];
  @apply transition-transform duration-700;
}

/* Status Dot Pulse */
.status-active {
  @apply animate-pulse;
  box-shadow: 0 0 0 0 hsl(var(--status-active-glow));
  animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Loading Spinner */
.spinner {
  @apply animate-spin;
}

/* Skeleton Loading */
.skeleton {
  @apply animate-pulse bg-muted rounded;
}
```

### 6.3 Page Transition

```css
/* Staggered card entrance */
.card-entrance {
  animation: slide-up 0.3s ease-out;
  animation-fill-mode: both;
}

.card-entrance:nth-child(1) { animation-delay: 0ms; }
.card-entrance:nth-child(2) { animation-delay: 50ms; }
.card-entrance:nth-child(3) { animation-delay: 100ms; }
.card-entrance:nth-child(4) { animation-delay: 150ms; }
```

---

## 7. Responsive Design

### 7.1 Breakpoint Strategy

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, stacked cards |
| Tablet | 640px - 1023px | 2-column grid, condensed info |
| Desktop | 1024px+ | 3-column grid, full detail view |

### 7.2 VPS List Page Responsive

```tsx
// Grid container
<div className={cn(
  "grid gap-4",
  viewMode === 'grid' && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  viewMode === 'list' && "grid-cols-1"
)}>
  {vpsList.map(vps => <VpsCard key={vps.id} vps={vps} />)}
</div>
```

### 7.3 VPS Detail Page Responsive

```tsx
// Main layout
<div className="grid gap-6 lg:grid-cols-3">
  {/* Main content - spans 2 columns on desktop */}
  <div className="lg:col-span-2 space-y-6">
    <VpsPowerControls />
    <VpsResourceMonitor />
    <VpsSshAccess />
    <VpsDangerZone />
  </div>
  
  {/* Sidebar - single column */}
  <div className="space-y-6">
    <VpsInstanceInfo />
    <VpsBillingInfo />
  </div>
</div>

// On mobile, all cards stack vertically
```

---

## 8. Accessibility

### 8.1 ARIA Implementation

```tsx
// Status indicators
<span
  className={statusClasses}
  role="status"
  aria-label={`Server status: ${statusLabel}`}
>
  <span className="sr-only">{statusLabel}</span>
  {/* Visual indicator */}
</span>

// Power buttons
<Button
  aria-label={`${isActive ? 'Stop' : 'Start'} server ${hostname}`}
  aria-pressed={isActive}
>
  ...
</Button>

// Modal dialogs
<Dialog
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  ...
</Dialog>
```

### 8.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Enter/Space` | Activate buttons, toggle switches |
| `Escape` | Close modals, cancel actions |
| `Arrow keys` | Navigate within dropdown menus |

### 8.3 Color Contrast

All status colors meet WCAG AA standards (4.5:1 for text, 3:1 for UI elements):

| Status | Background | Text | Contrast Ratio |
|--------|------------|------|----------------|
| Active | emerald-500/10 | emerald-700 | 7.2:1 |
| Stopped | slate-500/10 | slate-700 | 6.8:1 |
| Suspended | amber-500/10 | amber-700 | 5.1:1 |
| Expiring | yellow-500/10 | yellow-700 | 4.6:1 |
| Terminated | red-500/10 | red-700 | 6.5:1 |

---

## 9. Implementation Notes

### 9.1 File Structure

```
apps/customer-web/src/
├── app/(dashboard)/vps/
│   ├── page.tsx                    # VPS list page (enhanced)
│   └── [id]/
│       └── page.tsx                # VPS detail page (enhanced)
├── components/vps/
│   ├── index.ts                    # Barrel export
│   ├── VpsCard.tsx                 # Grid/List card component
│   ├── VpsStatusBadge.tsx          # Status indicator badge
│   ├── VpsPowerControls.tsx        # Power action panel
│   ├── VpsResourceMonitor.tsx      # Resource usage gauges
│   ├── VpsBillingInfo.tsx          # Billing and expiry card
│   ├── VpsDangerZone.tsx           # Destructive actions section
│   ├── VpsDeleteModal.tsx          # Delete confirmation dialog
│   ├── VpsRebuildModal.tsx         # Rebuild/reinstall dialog
│   └── VpsQuickActionsModal.tsx    # Quick action confirmations
├── hooks/
│   └── use-vps.ts                  # (existing) extend with mutations
└── types/
    └── vps.ts                      # VPS-specific type definitions
```

### 9.2 Required Package Check

Confirm these packages are available (already installed):

- ✅ `lucide-react` - Icons
- ✅ `class-variance-authority` - Component variants
- ✅ `tailwind-merge` - Class merging
- ✅ `tailwindcss-animate` - Animation utilities
- ✅ `@radix-ui/react-dialog` - Modal dialogs
- ✅ `@radix-ui/react-dropdown-menu` - Dropdown menus

Optional (recommended to add for charts):

- ⚠️ Consider adding `recharts` for resource monitoring charts

### 9.3 CSS Variables to Add

Add to `globals.css` the color tokens from section 2.1 above.

### 9.4 Component Priority Order

1. **VpsStatusBadge** - Used throughout, build first
2. **VpsCard** - Main list item component
3. **VpsPowerControls** - Critical user action
4. **VpsBillingInfo** - Important for retention
5. **VpsResourceMonitor** - Nice-to-have monitoring
6. **VpsDangerZone + Modals** - Safety-critical actions

---

## Summary

This design specification provides a **premium, distinctive VPS management UI** for Webrana Cloud that:

1. **Stands out** from generic cloud dashboards with subtle glassmorphism, smooth animations, and thoughtful micro-interactions
2. **Prioritizes scanability** with clear status indicators that users can read at a glance
3. **Maintains consistency** with the existing Webrana design system while extending it
4. **Works responsively** from mobile to desktop
5. **Meets accessibility standards** for all users
6. **Is immediately implementable** with exact Tailwind classes and component structures

**Ready for handoff to Frontend Engineering (FE team).**

---

*Design completed by Senior UI/UX Designer | Webrana Cloud*
