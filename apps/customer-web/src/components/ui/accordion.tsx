"use client"

import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
  value: string | undefined
  onValueChange: (value: string) => void
} | null>(null)

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type: "single"
    collapsible?: boolean
    value?: string
    onValueChange?: (value: string) => void
    defaultValue?: string
  }
>(({ className, collapsible, value: controlledValue, onValueChange, defaultValue, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue
  
  const handleValueChange = (newValue: string) => {
    const nextValue = newValue === value && collapsible ? "" : newValue
    if (onValueChange) {
      onValueChange(nextValue)
    } else {
      setUncontrolledValue(nextValue)
    }
  }

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("", className)} {...props} />
    </AccordionContext.Provider>
  )
})
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(AccordionContext)
  const isOpen = context?.value === value

  return (
    <div
      ref={ref}
      className={cn("border-b", className)}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    />
  )
})
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  // Get value from parent Item? 
  // In simplified version, we need to pass value manually or clone children.
  // Standard Shadcn relies on Radix context. Here we can rely on the fact that Item sets data-state? 
  // No, Trigger needs to call context.onValueChange(itemValue). 
  // To keep it simple without Radix complexity, I'll assume the parent Item wrapper handles some context or I just pass the onClick manually?
  // Better: Use a ItemContext to pass the value down.
  return (
    <AccordionItemContext.Consumer>
      {({ value }) => (
        <AccordionContext.Consumer>
          {({ value: selectedValue, onValueChange }) => (
            <div className="flex">
              <button
                ref={ref}
                onClick={() => onValueChange(value)}
                className={cn(
                  "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                  className
                )}
                data-state={selectedValue === value ? "open" : "closed"}
                {...props}
              >
                {children}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
              </button>
            </div>
          )}
        </AccordionContext.Consumer>
      )}
    </AccordionItemContext.Consumer>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <AccordionItemContext.Consumer>
    {({ value }) => (
      <AccordionContext.Consumer>
        {({ value: selectedValue }) => {
           const isOpen = selectedValue === value
           if (!isOpen) return null
           return (
            <div
              ref={ref}
              className={cn(
                "overflow-hidden text-sm transition-all animate-accordion-down data-[state=closed]:animate-accordion-up",
                className
              )}
              data-state={isOpen ? "open" : "closed"}
              {...props}
            >
              <div className="pb-4 pt-0">{children}</div>
            </div>
           )
        }}
      </AccordionContext.Consumer>
    )}
  </AccordionItemContext.Consumer>
))
AccordionContent.displayName = "AccordionContent"

// Helper context for Item to pass value to children
const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

// Redefine Item to provide context
const AccordionItemWithContext = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(AccordionContext)
  const isOpen = context?.value === value

  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        ref={ref}
        className={cn("border-b", className)}
        data-state={isOpen ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
})
AccordionItemWithContext.displayName = "AccordionItem"

export { Accordion, AccordionItemWithContext as AccordionItem, AccordionTrigger, AccordionContent }
