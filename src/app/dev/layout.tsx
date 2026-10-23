import "./dev.css";
import type { ReactNode } from "react";
import { DevProvider } from "./DevProvider";
import DevSidebarNav from "./DevSidebarNav";

/**
 * /dev — internal design-system reference. Not linked from the live
 * site's navigation; exists so the actual component library and design
 * tokens are documented as first-class artifacts instead of only living
 * implicitly in the source. Disabled entirely in production.
 *
 * Everything under /dev is one route now (see DevProvider.tsx) —
 * switching sections is a state change, not a navigation, so
 * DevProvider wraps both the sidebar and page.tsx's content here,
 * letting them share one `activeSection` value.
 */
const DevLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  // disable in production for real apps
  if (process.env.NODE_ENV === "production") return null;

  return (
    <DevProvider>
      <div className="dev-shell">
        <DevSidebarNav />

        <div>
          <main className="dev-content">{children}</main>
        </div>
      </div>
    </DevProvider>
  );
};

export default DevLayout;
