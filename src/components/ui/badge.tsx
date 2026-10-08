import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 label-mono transition-colors",
  {
    variants: {
      variant: {
        default: "border-lime/30 bg-lime/10 text-lime",
        mint: "border-mint/20 bg-mint/10 text-mint",
        neutral: "border-white/10 bg-white/[0.04] text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
