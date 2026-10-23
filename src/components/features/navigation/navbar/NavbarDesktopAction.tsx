"use client";

import ThemeToggle from "@/components/layouts/ThemeToggle";
import {
  useNavigationActions,
  useNavigationState,
} from "@/components/providers/NavigationProvider";
import { Hamburger } from "@/components/ui";
import { MOBILE_MENU_ID } from "@/packages/configs/navigation.config";

const NavbarDesktopAction = () => {
  const mobileMenuOpen = useNavigationState("mobileMenuOpen");
  const { toggleMobileMenu } = useNavigationActions();

  return (
    <div className="header-actions">
      <ThemeToggle />
      <Hamburger
        isOpen={mobileMenuOpen}
        onToggle={toggleMobileMenu}
        controls={MOBILE_MENU_ID}
      />
    </div>
  );
};

export default NavbarDesktopAction;
