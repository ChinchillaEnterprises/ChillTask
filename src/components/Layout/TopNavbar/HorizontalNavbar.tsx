"use client";

import React from "react";
import Link from "next/link";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";

const HorizontalNavbar = () => {
  const pathname = usePathname();

  return (
    <>
      <div className="horizontal-navbar-area" style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.05)"
      }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", px: 2 }}>
          {/* Home Button */}
          <Link
            href="/"
            className={`horizontal-nav-link ${pathname === "/" ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              textDecoration: "none",
              color: pathname === "/" ? "#2563eb" : "#666",
              background: pathname === "/"
                ? "#F6F7F9"
                : "rgba(255, 255, 255, 0.6)",
              borderRadius: "8px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              gap: "8px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
              transform: "scale(1)"
            }}
          >
            <i className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              home
            </i>
            <span style={{ fontWeight: pathname === "/" ? 600 : 400 }}>
              Home
            </span>
          </Link>

          {/* Channel Mappings Button */}
          <Link
            href="/channel-mappings"
            className={`horizontal-nav-link ${pathname === "/channel-mappings" ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              textDecoration: "none",
              color: pathname === "/channel-mappings" ? "#2563eb" : "#666",
              background: pathname === "/channel-mappings"
                ? "#F6F7F9"
                : "rgba(255, 255, 255, 0.6)",
              borderRadius: "8px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              gap: "8px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
              transform: "scale(1)"
            }}
          >
            <i className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              link
            </i>
            <span style={{ fontWeight: pathname === "/channel-mappings" ? 600 : 400 }}>
              Channel Mappings
            </span>
          </Link>
        </Box>
      </div>
    </>
  );
};

export default HorizontalNavbar;