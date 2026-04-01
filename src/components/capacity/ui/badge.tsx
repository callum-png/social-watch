import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/capacity-utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white",
        secondary:
          "border-transparent bg-gray-800 text-gray-300",
        green:
          "border-transparent bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
        yellow:
          "border-transparent bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
        red:
          "border-transparent bg-red-600/20 text-red-400 border-red-600/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
