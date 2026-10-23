import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType, HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/packages/utils/cn";
import { paddingXClass, type Space } from "./tokens";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      sm: "max-w-screen-sm",
      md: "max-w-screen-md",
      lg: "max-w-screen-lg",
      xl: "max-w-screen-xl",
      "2xl": "max-w-screen-2xl",
      fluid: "max-w-none",
    },
  },
  defaultVariants: {
    size: "xl",
  },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof containerVariants> {
  /** Semantic element to render. Defaults to `"div"`. */
  as?: "div" | "section" | "main" | "article";
  /** Horizontal gutter padding, from the shared spacing scale. Defaults to `"md"`. */
  gutter?: Space;
}

/**
 * `Container` centers page content and caps its width, with a responsive
 * horizontal gutter. Use it once near the top of a page/section, not
 * nested repeatedly.
 *
 * @example
 * <Container size="lg">
 *   <PageHeading />
 * </Container>
 *
 * @example
 * // Full-bleed section with its own inner constrained container
 * <Box className="bg-muted">
 *   <Container size="xl" gutter="lg">
 *     <Content />
 *   </Container>
 * </Box>
 */
export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ as = "div", size, gutter = "md", className, children, ...props }, ref) => {
    const Component = as as ElementType;

    return (
      <Component
        ref={ref}
        className={cn(
          containerVariants({ size }),
          paddingXClass[gutter],
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Container.displayName = "Container";
