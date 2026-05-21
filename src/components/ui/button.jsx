import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.18)] hover:bg-primary/90 hover:shadow-[0_16px_34px_hsl(var(--primary)/0.24)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_12px_28px_hsl(var(--destructive)/0.18)] hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-muted/40 text-foreground shadow-[inset_0_1px_0_hsl(140_30%_90%/0.05)] hover:bg-accent/60 hover:text-accent-foreground hover:border-primary/35",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-[inset_0_1px_0_hsl(140_30%_90%/0.05)] hover:bg-secondary",
        ghost: "text-foreground/80 hover:bg-accent/55 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
