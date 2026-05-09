import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer",
  {
    variants: {
      variant: {
        /* Standard shadcn variants */
        default:
          "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97] rounded-md",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 rounded-md",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary rounded-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md",
        ghost:
          "hover:bg-secondary text-foreground rounded-md",
        link:
          "text-primary underline-offset-4 hover:underline",

        /* ── RAKSHAK AI custom variants ───────────────────────────────── */
        navCta:
          "bg-nav-button text-foreground hover:bg-nav-button/80 active:scale-[0.97] rounded-lg uppercase tracking-widest text-xs",
        hero:
          "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97] rounded-sm uppercase tracking-wide text-sm font-bold",
        heroOutline:
          "bg-white text-background hover:brightness-90 active:scale-[0.97] rounded-sm uppercase tracking-wide text-sm font-bold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-6",
        xl:      "h-14 px-8 text-base",
        icon:    "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
