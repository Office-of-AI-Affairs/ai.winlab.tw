import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
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

function BlockSkeleton({
  className,
  size = "default",
  lines = 3,
  showMedia = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof blockVariants> & {
    lines?: number
    showMedia?: boolean
  }) {
  return (
    <Block
      aria-hidden
      className={cn("pointer-events-none", className)}
      size={size}
      {...props}
    >
      {showMedia && <Skeleton className="aspect-video w-full rounded-[2rem]" />}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/2 rounded-lg" />
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-4 w-full", index === lines - 1 && "w-2/3")}
          />
        ))}
      </div>
    </Block>
  )
}

export { Block, BlockSkeleton, blockVariants }
