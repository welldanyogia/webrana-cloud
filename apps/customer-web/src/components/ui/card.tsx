import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
      hover: {
        true: "cursor-pointer transition-all duration-200 hover:border-primary/50",
        false: "",
      },
      highlighted: {
        true: "border-primary/50 bg-primary/5",
        false: "",
      },
      glow: {
        true: "hover:shadow-[var(--glow-primary)]",
        false: "",
      }
    },
    defaultVariants: {
      padding: "none",
      hover: false,
      highlighted: false,
      glow: false,
    }
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, padding, hover, highlighted, glow, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ padding, hover, highlighted, glow }), className)}
    {...props}
  />
))
Card.displayName = "Card"

const cardHeaderVariants = cva("flex flex-col space-y-1.5 px-6 py-4", {
  variants: {
    noBorder: {
      true: "",
      false: "border-b",
    }
  },
  defaultVariants: {
    noBorder: false
  }
})

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardHeaderVariants>
>(({ className, noBorder, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardHeaderVariants({ noBorder }), className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const cardTitleVariants = cva("font-semibold leading-none tracking-tight", {
  variants: {
    size: {
      sm: "text-base",
      md: "text-lg",
      lg: "text-xl",
    }
  },
  defaultVariants: {
    size: "md"
  }
})

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & VariantProps<typeof cardTitleVariants>
>(({ className, size, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(cardTitleVariants({ size }), className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }
>(({ className, noPadding, ...props }, ref) => (
  <div ref={ref} className={cn(noPadding ? "" : "px-6 py-5", className)} {...props} />
))
CardContent.displayName = "CardContent"

const cardFooterVariants = cva("flex items-center px-6 py-4 border-t", {
  variants: {
    align: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    }
  },
  defaultVariants: {
    align: "start"
  }
})

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardFooterVariants>
>(({ className, align, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardFooterVariants({ align }), className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
