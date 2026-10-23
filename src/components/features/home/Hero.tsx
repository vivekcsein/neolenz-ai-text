import { Link } from "@/components/ui";
import appConfig from "@/packages/configs/app.config";
import { cn } from "@/packages/utils/cn";

const Hero = () => {
  const colors = {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",

    dot: "bg-primary",
    gradient: "from-primary to-secondary",
    gradientSoft: "from-primary/5 to-secondary/5",
    shadow: "hover:shadow-primary/25",
  };

  return (
    <section className="min-h-screen">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
        {/* Background Glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br blur-3xl",
              colors.gradientSoft,
            )}
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-8">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/50 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50">
            <span className={cn("h-2 w-2 rounded-full", colors.dot)} />

            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Enterprise-grade foundation
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-balance text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl">
              Ship faster with{" "}
              <span
                className={cn(
                  "relative inline-block bg-linear-to-r bg-clip-text text-transparent",
                  "animate-gradient bg-size-[200%_auto]",
                  colors.gradient,
                )}
              >
                {appConfig.author.name}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 -z-10 bg-linear-to-r opacity-40 blur-2xl",
                    colors.gradient,
                  )}
                />
              </span>
            </h1>

            <p className="text-balance text-xl leading-relaxed text-slate-600 dark:text-slate-400">
              Strict TypeScript, Zod validation, Tailwind v4 tokens, and a
              themeable font system. Everything you need to build
              production-ready applications.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
            <Link href="/dev" variant="primary-button">
              click Dev Panel
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
