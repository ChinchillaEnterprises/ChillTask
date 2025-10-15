"use client";

import * as React from "react";
import {
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
} from "@mui/material";

interface ProfileProps {}

// AUTH REMOVED - Simple static profile component without authentication
const Profile: React.FC<ProfileProps> = () => {
  return (
    <>
      <Tooltip title="Profile">
        <IconButton
          size="small"
          sx={{ p: 0, borderRadius: "5px" }}
        >
          <Avatar
            sx={{
              width: { xs: "35px", sm: "42px" },
              height: { xs: "35px", sm: "42px" },
              border: "2px solid #93c5fd",
              bgcolor: "#2563eb",
            }}
            className="mr-8"
          >
            U
          </Avatar>
          <Typography
            variant="h3"
            sx={{
              fontWeight: "600",
              fontSize: "13px",
              display: { xs: "none", sm: "block" },
            }}
            className="text-black"
          >
            Guest
          </Typography>
        </IconButton>
      </Tooltip>
    </>
  );
};

export default Profile;
