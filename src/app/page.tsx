"use client";

import * as React from "react";
import { Box, Typography, Button, Card, CardContent } from "@mui/material";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Home() {
  const router = useRouter();

  const actions = [
    {
      emoji: "💬",
      title: "Channel Mappings",
      description: "Connect Slack channels to GitHub repositories",
      path: "/channel-mappings"
    },
    {
      emoji: "📊",
      title: "Webhook Monitor",
      description: "View real-time GitHub webhook events",
      path: "/webhook-monitor"
    },
    {
      emoji: "✨",
      title: "Explore Features",
      description: "Discover automated Slack-to-GitHub sync",
      action: "scroll"
    }
  ];

  const handleAction = (action: any) => {
    if (action.path) {
      router.push(action.path);
    } else if (action.action === "scroll") {
      // Scroll to features section
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{
        maxWidth: 900,
        mx: 'auto',
        py: { xs: 6, md: 10 },
        px: 2
      }}>
        {/* Hero Section */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              mb: 2,
              fontSize: { xs: '32px', md: '42px' },
              letterSpacing: '-0.02em',
              color: '#1a1a1a',
            }}
          >
            Welcome back to ChillTask! 👋
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#666',
              fontWeight: 400,
              fontSize: { xs: '16px', md: '18px' },
              lineHeight: 1.6,
              maxWidth: '600px',
              mx: 'auto',
              mb: 5,
            }}
          >
            Bridge your team communication with your codebase through automated Slack-to-GitHub sync
          </Typography>

          {/* Action Cards */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 8
          }}>
            {actions.map((action, index) => (
              <Card
                key={index}
                onClick={() => handleAction(action)}
                sx={{
                  cursor: 'pointer',
                  boxShadow: 'none',
                  border: '1px solid #e0e0e0',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#9333ea',
                    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.1)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: '48px',
                      mb: 2,
                      lineHeight: 1
                    }}
                  >
                    {action.emoji}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: '#1a1a1a'
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#666',
                      lineHeight: 1.6
                    }}
                  >
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Features Section */}
        <Box id="features" sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              mb: 4,
              textAlign: 'center',
              fontSize: { xs: '24px', md: '32px' },
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
            <Card sx={{
              boxShadow: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '12px'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px', color: '#9333ea' }}
                  >
                    sync
                  </i>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Automated Slack Archiving
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Automatically sync Slack channel conversations to GitHub context folders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              boxShadow: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '12px'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px', color: '#9333ea' }}
                  >
                    link
                  </i>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Channel Mapping
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Connect Slack channels to GitHub repositories with flexible organization
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              boxShadow: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '12px'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px', color: '#9333ea' }}
                  >
                    webhook
                  </i>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      GitHub Webhooks
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Real-time notifications and monitoring for GitHub push events
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              boxShadow: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '12px'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px', color: '#9333ea' }}
                  >
                    history
                  </i>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Message History
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Sync historical Slack messages with full file attachment support
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Tech Stack */}
        <Box sx={{
          textAlign: 'center',
          p: 4,
          backgroundColor: '#fafafa',
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
            Built With Modern Tools
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Next.js · AWS Amplify Gen 2 · DynamoDB · Lambda · AppSync · Slack API · GitHub API
          </Typography>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
