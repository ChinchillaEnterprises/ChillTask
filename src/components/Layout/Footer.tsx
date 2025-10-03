"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <>
      <Box
        className="footer-area"
        sx={{
          textAlign: "center",
          background: "#1e293b",
          borderTop: "1px solid #334155",
          padding: "20px 25px",
          position: "relative",
        }}
      >
        <Typography
          sx={{
            color: "#94a3b8",
            fontWeight: 500,
            fontSize: "14px",
          }}
        >
          © 2025 <span style={{ fontWeight: 600, color: "#e2e8f0" }}>Chinchilla AI</span> • Building Tomorrow's Intelligence
        </Typography>
      </Box>
    </>
  );
};

export default Footer;
