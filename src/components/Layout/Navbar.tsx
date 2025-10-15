'use client';

import * as React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/authentication/sign-in');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: '#e0e0e0',
        boxShadow: 'none',
      }}
      elevation={0}
    >
      <Toolbar sx={{ gap: 2 }}>
        {/* Logo/Brand */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            mr: 2,
            fontSize: '1.1rem',
            color: '#1a1a1a'
          }}
          onClick={() => router.push('/')}
        >
          ChillTask
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button
            color="inherit"
            onClick={() => router.push('/')}
            sx={{
              textTransform: 'none',
              color: '#666',
              '&:hover': {
                color: '#9333ea',
                backgroundColor: 'transparent'
              }
            }}
          >
            Home
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push('/channel-mappings')}
            sx={{
              textTransform: 'none',
              color: '#666',
              '&:hover': {
                color: '#9333ea',
                backgroundColor: 'transparent'
              }
            }}
          >
            Mappings
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push('/webhook-monitor')}
            sx={{
              textTransform: 'none',
              color: '#666',
              '&:hover': {
                color: '#9333ea',
                backgroundColor: 'transparent'
              }
            }}
          >
            Monitor
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Sign Out Button */}
        {isAuthenticated && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleSignOut}
            sx={{
              textTransform: 'none',
              borderColor: '#e0e0e0',
              color: '#666',
              borderRadius: '8px',
              px: 2,
              '&:hover': {
                borderColor: '#9333ea',
                color: '#9333ea',
                backgroundColor: 'transparent',
              }
            }}
          >
            Sign Out
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
