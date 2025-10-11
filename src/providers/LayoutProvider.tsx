"use client";

import React, { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import LeftSidebarMenu from "@/components/Layout/LeftSidebarMenu";
import TopNavbar from "./../components/Layout/TopNavbar/index";
import Footer from "@/components/Layout/Footer";
import ControlPanel from "@/components/Layout/ControlPanel";

interface LayoutProviderProps {
  children: ReactNode;
}

const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [active, setActive] = useState<boolean>(false);
  const pathname = usePathname();

  const toggleActive = () => {
    setActive(!active);
  };

  // AUTH REMOVED - No auth pages to check for anymore, always show layout
  // const isAuthPage = [...].includes(pathname);

  return (
    <>
      <div className={`main-wrapper-content ${active ? "active" : ""}`}>
        <TopNavbar toggleActive={toggleActive} />
        <LeftSidebarMenu toggleActive={toggleActive} isCollapsed={active} />

        <div className="main-content">
          {children}
          <Footer />
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: "15px",
          right: "15px",
          zIndex: "-5",
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <ControlPanel />
      </div>
    </>
  );
};

export default LayoutProvider;
