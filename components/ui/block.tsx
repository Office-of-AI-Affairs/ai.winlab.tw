import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const blockVariants = cva(
  "rounded-[2rem] p-6 w-full",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        outline: "border border-border bg-background",
        ghost: "bg-transparent text-muted-foreground",
      },
      size: {
        sm: "min-h-[120px]",
        default: "",
        lg: "min-h-[280px]",
        auto: "h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Block({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof blockVariants>) {
  return (
    <div
      data-slot="block"
      data-variant={variant}
      data-size={size}
      className={cn("grid gap-6", blockVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Block, blockVariants }
