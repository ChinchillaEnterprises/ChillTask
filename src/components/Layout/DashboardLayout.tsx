'use client';

import * as React from 'react';
import { Box, Toolbar } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
