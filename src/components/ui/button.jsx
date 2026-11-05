// @ts-nocheck
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,box-shadow,transform,background-color,border-color,opacity] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] duration-200 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#8f673f]",
        outline:
          "border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] hover:border-[#A67C52]",
        secondary:
          "border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] hover:border-[#A67C52]",
        whatsapp:
          "bg-[#25D366] text-white hover:bg-[#20ba59] border border-[#25D366]",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        "admin-success":
          "bg-green-600 text-white hover:bg-green-700 shadow-sm focus-visible:ring-green-600/30",
        "admin-destructive":
          "bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-600/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 text-xs uppercase tracking-[0.18em] font-semibold",
        xs: "h-7 gap-1 px-2.5 text-xs in-data-[slot=button-group]:rounded-none has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3.5 text-xs in-data-[slot=button-group]:rounded-none has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 text-xs uppercase tracking-[0.2em] font-semibold",
        icon: "size-11",
        "icon-xs":
          "size-7 in-data-[slot=button-group]:rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 in-data-[slot=button-group]:rounded-none",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {"default"|"outline"|"secondary"|"ghost"|"destructive"|"admin-success"|"admin-destructive"|"link"} [props.variant]
 * @param {"default"|"xs"|"sm"|"lg"|"icon"|"icon-xs"|"icon-sm"|"icon-lg"} [props.size]
 * @param {any} [props.children]
 * @param {any} [props.rest]
 */
function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props} />
  );
}

export { Button, buttonVariants }
