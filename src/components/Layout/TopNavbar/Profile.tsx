"use client";

import * as React from "react";
import {
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import Logout from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "@/providers/AuthProvider";

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user, signOut } = useAuth();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <Tooltip title="Account settings">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ p: 0, borderRadius: "5px" }}
          aria-controls={open ? "account-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
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
            {user?.avatar || "U"}
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
            {user?.name || "User"}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: "15px" }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: "7px",
            boxShadow: "0 4px 45px #0000001a",
            overflow: "visible",
            mt: 1.5,
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        className="for-dark-top-navList"
      >
        <MenuItem sx={{ padding: "8px 20px" }} onClick={handleLogout}>
          <Box
            className="text-black"
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <ListItemIcon sx={{ mr: "-10px", mt: "-3px" }}>
              <Logout sx={{ fontSize: "20px" }} className="text-black" />
            </ListItemIcon>

            <span style={{ fontSize: "13px" }}>Logout</span>
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
};

export default Profile;
