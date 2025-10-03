"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Typography, useTheme } from "@mui/material";

interface LeftSidebarProps {
  toggleActive: () => void;
  isCollapsed?: boolean;
}

const LeftSidebarMenu: React.FC<LeftSidebarProps> = ({ toggleActive, isCollapsed = false }) => {
  const pathname = usePathname();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    const checkCompactMode = () => {
      const mainWrapper = document.querySelector(".main-wrapper-content");
      setIsCompact(mainWrapper?.classList.contains("compact-sidebar") || false);
    };

    checkCompactMode();
    
    // Observer to watch for class changes
    const observer = new MutationObserver(checkCompactMode);
    const mainWrapper = document.querySelector(".main-wrapper-content");
    if (mainWrapper) {
      observer.observe(mainWrapper, { attributes: true, attributeFilter: ["class"] });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Box className="leftSidebarDark hide-for-horizontal-nav">
        <Box className="left-sidebar-menu">
          <Box className="logo">
            <Link href="/" className="logo-link">
              <Typography
                component={"span"}
                className="logo-text"
                sx={{
                  color: '#2563eb',
                  fontWeight: 600,
                  display: (isCollapsed || isCompact) ? 'none' : 'inline-block'
                }}
              >
                ChillTask
              </Typography>
            </Link>
          </Box>

          <Box className="burger-menu" onClick={toggleActive}>
            <Typography component={"span"} className="top-bar"></Typography>
            <Typography component={"span"} className="middle-bar"></Typography>
            <Typography component={"span"} className="bottom-bar"></Typography>
          </Box>

          <Box className="sidebar-inner">
            <Box className="sidebar-menu">
              <Typography
                className="sub-title main-menu-text"
                sx={{
                  display: (isCollapsed || isCompact) ? 'none' : 'block',
                  fontWeight: "500",
                  textTransform: "uppercase",
                  mt: 2,
                  mb: 2
                }}
              >
                MAIN MENU
              </Typography>

              {/* Channel Mappings Menu Item */}
              <Box className="sidebar-single-menu" sx={{ mb: 1 }}>
                <Link
                  href="/channel-mappings"
                  className={`sidemenu-link ${pathname === "/channel-mappings" ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: (isCollapsed || isCompact) ? "center" : "flex-start",
                    padding: "12px 16px",
                    textDecoration: "none",
                    color: pathname === "/channel-mappings" ? "#2563eb" : isDarkMode ? "#ffffff" : "#64748b",
                    background: pathname === "/channel-mappings"
                      ? "rgba(37, 99, 235, 0.08)"
                      : "transparent",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "none"
                  }}
                >
                  <i
                    className="material-symbols-outlined menu-icon"
                    style={{
                      marginRight: (isCollapsed || isCompact) ? "0" : "12px",
                      fontSize: "20px"
                    }}
                  >
                    link
                  </i>
                  <Typography
                    component="span"
                    className="menu-text"
                    sx={{
                      fontWeight: pathname === "/channel-mappings" ? 600 : 400,
                      display: (isCollapsed || isCompact) ? 'none' : 'inline-block'
                    }}
                  >
                    Channel Mappings
                  </Typography>
                </Link>
              </Box>

              {/* Future menu items will be added here by AI as features are built */}
              
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default LeftSidebarMenu;