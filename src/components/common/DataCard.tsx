'use client';

import * as React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

interface DataCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export default function DataCard({
  title,
  value,
  change,
  icon,
  trend,
  color = 'primary',
}: DataCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              color="text.secondary"
              variant="body2"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
          </Box>
          {icon && (
            <Avatar
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.dark`,
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>
        {change && trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend === 'up' ? (
              <ArrowUpward sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <ArrowDownward sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: trend === 'up' ? 'success.main' : 'error.main',
                fontWeight: 600,
              }}
            >
              {change}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
