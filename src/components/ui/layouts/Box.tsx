import type { ElementType, HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/packages/utils/cn";
import { paddingClass, type Space } from "./tokens";

/** Elements `Box` is allowed to render as. Kept to plain structural/content tags. */
export type BoxElement =
  | "div"
  | "span"
  | "section"
  | "article"
  | "main"
  | "header"
  | "footer"
  | "nav"
  | "aside"
  | "figure"
  | "ul"
  | "li";

export interface BoxProps extends HTMLAttributes<HTMLElement> {
  /**
   * Semantic HTML element to render. Defaults to `"div"`.
   * @example <Box as="section">...</Box>
   */
  as?: BoxElement;
  /** Padding on all sides, from the shared spacing scale. */
  padding?: Space;
}

/**
 * `Box` is the most generic layout primitive: a semantic element with
 * consistent spacing. Every other layout primitive in this system is built
 * as a thin, opinionated wrapper around it — reach for `Box` directly only
 * when none of the more specific primitives (`Stack`, `Inline`, `Grid`, ...)
 * fit.
 *
 * @example
 * <Box as="section" padding="lg" className="bg-card rounded-xl">
 *   <p>Some content</p>
 * </Box>
 */
export const Box = forwardRef<HTMLElement, BoxProps>(
  ({ as = "div", padding, className, children, ...props }, ref) => {
    const Component = as as ElementType;

    return (
      <Component
        ref={ref}
        className={cn(padding && paddingClass[padding], className)}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Box.displayName = "Box";
