"use client";

import * as React from "react";
import { Box, Typography, Button, Card, CardContent } from "@mui/material";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: "sync",
      title: "Automated Slack Archiving",
      description: "Automatically sync Slack channel conversations to GitHub context folders for AI-powered development workflows"
    },
    {
      icon: "link",
      title: "Channel Mapping",
      description: "Connect Slack channels to GitHub repositories with flexible context folder organization"
    },
    {
      icon: "webhook",
      title: "GitHub Webhooks",
      description: "Real-time notifications and monitoring for GitHub push events with comprehensive logging"
    },
    {
      icon: "history",
      title: "Message History",
      description: "Sync historical Slack messages and track processing status with full file attachment support"
    }
  ];

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      {/* Hero Section */}
      <Box sx={{ mb: 8, textAlign: 'center' }}>
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
            mb: 4,
          }}
        >
          Bridge your team communication with your codebase. Automatically archive Slack conversations to GitHub for AI assistants and documentation workflows.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/channel-mappings')}
            sx={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#333',
                boxShadow: 'none',
              }
            }}
          >
            Channel Mappings
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push('/webhook-monitor')}
            sx={{
              borderColor: '#e0e0e0',
              color: '#1a1a1a',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              border: '1px solid #e0e0e0',
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#1a1a1a',
                backgroundColor: '#f7f7f8',
                boxShadow: 'none',
              }
            }}
          >
            Webhook Monitor
          </Button>
        </Box>
      </Box>

      {/* Features Grid */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            mb: 4,
            textAlign: 'center',
            fontSize: { xs: '24px', md: '28px' },
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
          }}
        >
          Key Features
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3
        }}>
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                boxShadow: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <i
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '32px',
                      color: '#2563eb'
                    }}
                  >
                    {feature.icon}
                  </i>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* How It Works */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            mb: 4,
            textAlign: 'center',
            fontSize: { xs: '24px', md: '28px' },
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
          }}
        >
          How It Works
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>1</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Configure Mappings
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Link Slack channels to GitHub repositories and specify context folder paths
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>2</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Messages Flow
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Slack webhook events capture new messages and file attachments in real-time
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>3</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Auto-Sync to GitHub
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Scheduled Lambda processes messages and commits them to designated context folders
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tech Stack */}
      <Box sx={{
        textAlign: 'center',
        p: 4,
        backgroundColor: '#f7f7f8',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
      }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 2,
            fontSize: { xs: '20px', md: '24px' },
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
          }}
        >
          Built With
        </Typography>
        <Typography variant="body1" sx={{ color: '#666' }}>
          Next.js · AWS Amplify Gen 2 · DynamoDB · Lambda · AppSync · Slack API · GitHub API
        </Typography>
      </Box>
      </Box>
    </DashboardLayout>
  );
}