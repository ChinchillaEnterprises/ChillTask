import * as React from "react";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Welcome Section - ChillTask Style */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 600,
            mb: 2,
            fontSize: { xs: '28px', sm: '36px', md: '42px' },
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
          }}
        >
          ChillTask
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: '#666',
            fontWeight: 400,
            fontSize: { xs: '16px', sm: '18px' },
            lineHeight: 1.6,
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          Automated Slack-to-GitHub context archiving. Bridge your team communication with your codebase.
        </Typography>
      </Box>

      {/* Quick Actions - Minimal */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mb: 6,
        }}
      >
        <Link href="/channel-mappings" style={{ textDecoration: 'none' }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            sx={{
              py: 2,
              px: 3,
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              color: '#1a1a1a',
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              justifyContent: 'flex-start',
              textAlign: 'left',
              '&:hover': {
                backgroundColor: '#f9f9f9',
                borderColor: '#d0d0d0',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography sx={{ fontSize: '24px' }}>🔗</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                  Channel Mappings
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontSize: '14px' }}>
                  Connect Slack channels to GitHub repositories
                </Typography>
              </Box>
            </Box>
          </Button>
        </Link>

        <Link href="/webhook-monitor" style={{ textDecoration: 'none' }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            sx={{
              py: 2,
              px: 3,
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              color: '#1a1a1a',
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              justifyContent: 'flex-start',
              textAlign: 'left',
              '&:hover': {
                backgroundColor: '#f9f9f9',
                borderColor: '#d0d0d0',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography sx={{ fontSize: '24px' }}>📊</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                  Webhook Monitor
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontSize: '14px' }}>
                  Monitor GitHub webhook events and sync status
                </Typography>
              </Box>
            </Box>
          </Button>
        </Link>
      </Box>

      {/* Feature Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 6,
        }}
      >
        <Box
          sx={{
            p: 3,
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '24px', mb: 1 }}>🔄</Typography>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Automated Sync Pipeline
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Real-time webhook captures + scheduled Lambda sync every 5 minutes
          </Typography>
        </Box>

        <Box
          sx={{
            p: 3,
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '24px', mb: 1 }}>📝</Typography>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Message History
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Sync historical Slack messages with full file attachment support
          </Typography>
        </Box>

        <Box
          sx={{
            p: 3,
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '24px', mb: 1 }}>🔒</Typography>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Enterprise-Grade Security
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            AWS Cognito authentication + API key authorization
          </Typography>
        </Box>

        <Box
          sx={{
            p: 3,
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '24px', mb: 1 }}>⚙️</Typography>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Flexible Routing
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Map multiple channels to repos with custom context folders
          </Typography>
        </Box>
      </Box>

      {/* Tech Stack Footer */}
      <Box
        sx={{
          mt: 8,
          pt: 4,
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#999',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: 1.6,
            mb: 1,
          }}
        >
          Built With
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#666',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          Next.js · AWS Amplify Gen 2 · DynamoDB · Lambda · AppSync · Slack API · GitHub API
        </Typography>
      </Box>
    </>
  );
}
