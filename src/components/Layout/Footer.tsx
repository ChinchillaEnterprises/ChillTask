'use client';

import * as React from 'react';
import { Box, Typography, Link } from '@mui/material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        bgcolor: 'background.paper',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
      }}
    >
      <Box sx={{
        maxWidth: 900,
        mx: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} ChillTask. Built with AWS Amplify Gen 2.
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener"
            color="text.secondary"
            underline="hover"
            sx={{
              fontSize: '14px',
              '&:hover': { color: '#9333ea' },
              transition: 'color 0.2s',
            }}
          >
            GitHub
          </Link>
          <Link
            href="#"
            color="text.secondary"
            underline="hover"
            sx={{
              fontSize: '14px',
              '&:hover': { color: '#9333ea' },
              transition: 'color 0.2s',
            }}
          >
            Documentation
          </Link>
          <Link
            href="#"
            color="text.secondary"
            underline="hover"
            sx={{
              fontSize: '14px',
              '&:hover': { color: '#9333ea' },
              transition: 'color 0.2s',
            }}
          >
            Support
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
