import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none outline-none transition-[background-color,color,box-shadow,scale,opacity] duration-150 ease-out active:enabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-accent)]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg shadow-[0_0_24px_rgb(186_10_14_/_0.28)] hover:bg-accent-hover",
        secondary:
          "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] hover:bg-surface-3",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)] hover:bg-surface-2",
        ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-fg",
        danger:
          "bg-transparent text-fg shadow-[0_0_0_1px_rgb(186_10_14_/_0.45)] hover:bg-accent hover:text-accent-fg",
      },
      size: {
        sm: "h-9 rounded-sm px-3 text-sm",
        md: "h-11 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-5 text-base",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
