"use client";

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 OAuth callback page loaded');

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      console.log('🔔 Auth Hub Event in callback:', payload.event, payload);

      switch (payload.event) {
        case 'signedIn':
          console.log('✅ OAuth sign-in successful');
          setStatus('success');
          // Small delay to show success state, then redirect
          setTimeout(() => {
            router.push('/');
          }, 1000);
          break;

        case 'signInWithRedirect':
          console.log('🔄 OAuth processing complete, checking auth status...');
          checkAuthAndRedirect();
          break;

        case 'signInWithRedirect_failure':
          console.log('❌ OAuth failed:', payload);
          setStatus('error');
          setError(payload.data?.message || 'OAuth authentication failed');
          // Redirect to sign-in after showing error
          setTimeout(() => {
            router.push('/authentication/sign-in');
          }, 3000);
          break;
      }
    });

    // Also check auth status immediately in case the event already fired
    const timeoutId = setTimeout(() => {
      checkAuthAndRedirect();
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]);

  const checkAuthAndRedirect = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        console.log('✅ User authenticated successfully:', currentUser.userId);
        setStatus('success');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } catch (err) {
      console.log('⚠️ Auth check failed, will retry or show error');
      // If we're still processing, keep waiting
      if (status === 'processing') {
        // Retry after a short delay
        setTimeout(() => {
          checkAuthAndRedirect();
        }, 2000);
      }
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <CircularProgress size={40} sx={{ color: 'primary.main' }} />,
          title: 'Completing sign-in...',
          subtitle: 'Please wait while we finish setting up your account.'
        };
      case 'success':
        return {
          icon: '✅',
          title: 'Sign-in successful!',
          subtitle: 'Redirecting you to your dashboard...'
        };
      case 'error':
        return {
          icon: '❌',
          title: 'Sign-in failed',
          subtitle: error || 'Something went wrong. Redirecting back to sign-in...'
        };
    }
  };

  const { icon, title, subtitle } = getStatusContent();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 3
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          maxWidth: 400,
          p: 4,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 2
        }}
      >
        <Box sx={{ mb: 3, fontSize: '2rem' }}>
          {typeof icon === 'string' ? icon : icon}
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: status === 'error' ? 'error.main' : 'text.primary'
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            mb: status === 'error' ? 3 : 0
          }}
        >
          {subtitle}
        </Typography>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
            If this problem persists, please try signing in again or contact support.
          </Alert>
        )}
      </Box>
    </Box>
  );
}