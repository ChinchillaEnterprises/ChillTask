"use client";

import * as React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3
      }}
    >
      <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
        Welcome to ChillTask
      </Typography>
      <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center', maxWidth: 600 }}>
        Manage your Slack channel mappings and GitHub integrations
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => router.push('/channel-mappings')}
        sx={{
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          px: 4,
          py: 1.5,
          fontSize: '1.1rem',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#1d4ed8',
            boxShadow: 'none',
          }
        }}
      >
        Go to Channel Mappings
      </Button>
    </Box>
  );
}