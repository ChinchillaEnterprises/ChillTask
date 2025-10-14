'use client';

import * as React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';
import {
  GitHub as GitHubIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 4 }}>
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              ChillTask
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Slack to GitHub Context Archiver
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Product
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">
                Features
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Pricing
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Documentation
              </Link>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">
                About
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Blog
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Contact
              </Link>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="text.secondary" underline="hover">
                Privacy Policy
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Terms of Service
              </Link>
              <Link href="#" color="text.secondary" underline="hover">
                Cookie Policy
              </Link>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} ChillTask. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener"
              color="text.secondary"
              sx={{
                '&:hover': { color: 'primary.main' },
                transition: 'color 0.2s',
              }}
            >
              <GitHubIcon />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener"
              color="text.secondary"
              sx={{
                '&:hover': { color: 'primary.main' },
                transition: 'color 0.2s',
              }}
            >
              <TwitterIcon />
            </Link>
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noopener"
              color="text.secondary"
              sx={{
                '&:hover': { color: 'primary.main' },
                transition: 'color 0.2s',
              }}
            >
              <LinkedInIcon />
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
