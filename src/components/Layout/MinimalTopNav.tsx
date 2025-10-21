"use client";

import React, { useEffect, useState } from "react";
import { AppBar, Toolbar, Box, Button, IconButton, Avatar, Menu, MenuItem, Divider, ListItemIcon, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { fetchUserAttributes } from "aws-amplify/auth";

interface MinimalTopNavProps {
  mode: 'marketing' | 'dashboard';
}

const MinimalTopNav: React.FC<MinimalTopNavProps> = ({ mode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut: authSignOut, isAuthenticated } = useAuth();
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    // Fetch user attributes if authenticated
    if (isAuthenticated) {
      fetchUserAttributes()
        .then(attrs => setUserAttributes(attrs))
        .catch(err => console.error('Failed to fetch user attributes:', err));
    }
  }, [isAuthenticated]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await authSignOut(); // Use real Amplify sign out
      router.push("/authentication/sign-in");
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    router.push(path);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
      }}
    >
      <Box
        sx={{
          maxWidth: mode === 'marketing' ? '100%' : '900px',
          mx: 'auto',
          width: '100%',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: '56px', sm: '64px' },
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Logo */}
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '20px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📬</span>
            <span style={{ letterSpacing: '-0.02em' }}>ChillTask</span>
          </Link>

          {/* Right: Navigation based on mode */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {mode === 'marketing' ? (
              // Marketing mode (logged out)
              <>
                <Button
                  component={Link}
                  href="/news"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: 'text.secondary',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'text.primary',
                    },
                  }}
                >
                  News
                </Button>
                <Button
                  component={Link}
                  href="/about"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: 'text.secondary',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'text.primary',
                    },
                  }}
                >
                  About
                </Button>
                <Button
                  component={Link}
                  href="/pricing"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: 'text.secondary',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'text.primary',
                    },
                  }}
                >
                  Pricing
                </Button>
                <Button
                  component={Link}
                  href="/help"
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    color: 'text.secondary',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'text.primary',
                    },
                  }}
                >
                  Help
                </Button>
                <Button
                  component={Link}
                  href="/authentication/sign-in"
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    borderRadius: '8px',
                    px: 2,
                    py: 0.75,
                    backgroundColor: '#000',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: '#333',
                    },
                  }}
                >
                  Sign In
                </Button>
              </>
            ) : (
              // Dashboard mode (logged in)
              <>
                <IconButton
                  component={Link}
                  href="/"
                  sx={{
                    color: pathname === '/' ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  size="medium"
                >
                  <i className="material-symbols-outlined" style={{ fontSize: '22px' }}>home</i>
                </IconButton>

                <IconButton
                  component={Link}
                  href="/news"
                  sx={{
                    color: pathname === '/news' ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  size="medium"
                >
                  <i className="material-symbols-outlined" style={{ fontSize: '22px' }}>newspaper</i>
                </IconButton>

                <IconButton
                  component={Link}
                  href="/chat"
                  sx={{
                    color: pathname === '/chat' ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  size="medium"
                >
                  <i className="material-symbols-outlined" style={{ fontSize: '22px' }}>chat</i>
                </IconButton>

                {/* User Avatar with Dropdown */}
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    ml: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  size="small"
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '14px',
                      backgroundColor: '#605dff',
                    }}
                  >
                    {userAttributes?.given_name?.charAt(0) || userAttributes?.email?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>

                {/* Profile Dropdown Menu */}
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  sx={{
                    mt: 1,
                    '& .MuiPaper-root': {
                      borderRadius: '12px',
                      minWidth: '200px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  {/* User Info */}
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>
                      {userAttributes?.given_name && userAttributes?.family_name
                        ? `${userAttributes.given_name} ${userAttributes.family_name}`
                        : userAttributes?.email || 'User'}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#666' }}>
                      {userAttributes?.email || user?.username || ''}
                    </Typography>
                  </Box>

                  {/* Menu Items */}
                  <MenuItem onClick={() => handleNavigate('/dashboard')} sx={{ py: 1.5, fontSize: '14px' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</i>
                    </ListItemIcon>
                    Dashboard
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate('/profile')} sx={{ py: 1.5, fontSize: '14px' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</i>
                    </ListItemIcon>
                    Profile
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate('/settings')} sx={{ py: 1.5, fontSize: '14px' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</i>
                    </ListItemIcon>
                    Settings
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate('/notifications')} sx={{ py: 1.5, fontSize: '14px' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</i>
                    </ListItemIcon>
                    Notifications
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate('/billing')} sx={{ py: 1.5, fontSize: '14px' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>credit_card</i>
                    </ListItemIcon>
                    Billing
                  </MenuItem>

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem onClick={handleLogout} sx={{ py: 1.5, fontSize: '14px', color: '#d32f2f' }}>
                    <ListItemIcon>
                      <i className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d32f2f' }}>logout</i>
                    </ListItemIcon>
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Box>
    </AppBar>
  );
};

export default MinimalTopNav;
