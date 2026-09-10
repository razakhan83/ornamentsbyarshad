// @ts-nocheck
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20",
  {
    variants: {
      variant: {
        default:
          "border-primary/15 bg-primary/10 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        emerald:
          "border-success/15 bg-success/10 text-success",
        success:
          "border-green-200 bg-green-100 text-green-700 hover:bg-green-100/80",
        accent:
          "border-accent/25 bg-accent/18 text-accent-foreground",
        destructive:
          "border-destructive/15 bg-destructive/10 text-destructive",
        info:
          "border-info/15 bg-info/10 text-info",
        warning:
          "border-warning/15 bg-warning/10 text-warning",
        outline: 
          "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
