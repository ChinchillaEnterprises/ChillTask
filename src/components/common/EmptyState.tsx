'use client';

import * as React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = 'No data found',
  message = 'There is nothing to display here yet.',
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 2,
        p: 4,
      }}
    >
      <Box
        sx={{
          color: 'text.secondary',
          opacity: 0.5,
          '& .MuiSvgIcon-root': {
            fontSize: 80,
          },
        }}
      >
        {icon || <InboxIcon />}
      </Box>
      <Typography variant="h6" fontWeight={600} color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
