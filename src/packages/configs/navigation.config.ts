import type { NavSection, NavTab } from "@/types/navigation";
import appConfig from "./app.config";

/** Desktop nav shows at/above this width. Keep in sync with the 1024px breakpoints in styles/ui/*.css. */
export const DESKTOP_NAV_MEDIA_QUERY = "(min-width: 1024px)";

/** id of the mobile drawer panel — the hamburger's aria-controls target. */
export const MOBILE_MENU_ID = "mobile-menu";

export const mainNav: NavTab[] = [
  { id: "home", title: "Home", href: appConfig.routes.home },
  { id: "about", title: "About", href: appConfig.routes.about },
  {
    id: "legal",
    title: "Legal",
    dropdown: [
      {
        category: "Company",
        items: [
          { label: "Contact", href: appConfig.routes.legal.contact },
          { label: "Privacy", href: appConfig.routes.legal.privacy },
          { label: "Terms", href: appConfig.routes.legal.terms },
        ],
      },
    ],
  },
];
export const footerNav: NavSection[] = [
  {
    title: "Explore",
    items: [
      { label: "Home", href: appConfig.routes.home },
      { label: "About", href: appConfig.routes.about },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Contact", href: appConfig.routes.legal.contact },
      { label: "Privacy", href: appConfig.routes.legal.privacy },
      { label: "Terms", href: appConfig.routes.legal.terms },
    ],
  },
];
