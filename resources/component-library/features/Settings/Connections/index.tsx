"use client";

import React from "react";
import { Card, Box, Typography, Button, Divider } from "@mui/material";
import Image from "next/image";
import NavList from "../NavList";

const Connections: React.FC = () => {
  // Data for connected accounts
  const connectedAccounts = [
    {
      id: 1,
      name: "Google",
      icon: "/images/socials/google.svg",
      description: "Calendar and Contacts",
    },
    {
      id: 2,
      name: "Slack",
      icon: "/images/socials/slack.svg",
      description: "Communications",
    },
    {
      id: 3,
      name: "GitHub",
      icon: "/images/socials/github.svg",
      description: "Manage your Git repositories",
    },
    {
      id: 4,
      name: "Mailchimp",
      icon: "/images/socials/mailchimp.svg",
      description: "Email marketing service",
    },
    {
      id: 5,
      name: "Figma",
      icon: "/images/socials/figma.svg",
      description: "Design",
    },
  ];

  // Data for social accounts
  const socialAccounts = [
    {
      id: 1,
      name: "Facebook",
      icon: "/images/socials/facebook.svg",
    },
    {
      id: 2,
      name: "X",
      icon: "/images/socials/twitter.svg",
    },
    {
      id: 3,
      name: "Instagram",
      icon: "/images/socials/instagram.svg",
    },
    {
      id: 4,
      name: "Dribbble",
      icon: "/images/socials/dribbble.svg",
    },
    {
      id: 5,
      name: "Behance",
      icon: "/images/socials/behance.svg",
    },
  ];

  return (
    <>
      <Card
        sx={{
          boxShadow: "none",
          borderRadius: "7px",
          mb: "25px",
          padding: { xs: "18px", sm: "20px", lg: "25px" },
        }}
        className="rmui-card"
      >
        <NavList />

        {/* Connected Accounts */}
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "16px", md: "18px" },
              fontWeight: 700,
              mb: "10px",
            }}
            className="text-black"
          >
            Connected Accounts
          </Typography>

          <Box>
            {connectedAccounts.map((account) => (
              <Box
                key={account.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: "25px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <Box>
                    <Image
                      src={account.icon}
                      alt={account.name}
                      width={40}
                      height={40}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="h5"
                      className="text-black"
                      sx={{
                        fontWeight: "600",
                        fontSize: "14px",
                        mb: "4px",
                      }}
                    >
                      {account.name}
                    </Typography>

                    <Typography component="span" sx={{ display: "block" }}>
                      {account.description}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Button
                    variant="text"
                    sx={{
                      textTransform: "capitalize",
                      fontWeight: "normal",
                      fontSize: "14px",
                      padding: "0",
                    }}
                  >
                    Click to Disconnect
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: "30px" }}></Divider>

        {/* Social Accounts */}
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "16px", md: "18px" },
              fontWeight: 700,
              mb: "10px",
            }}
            className="text-black"
          >
            Social Accounts
          </Typography>

          <Box>
            {socialAccounts.map((account) => (
              <Box
                key={account.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: "25px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <Box>
                    <Image
                      src={account.icon}
                      alt={account.name}
                      width={40}
                      height={40}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="h5"
                      className="text-black"
                      sx={{
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      {account.name}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Button
                    variant="text"
                    sx={{
                      textTransform: "capitalize",
                      fontWeight: "normal",
                      fontSize: "14px",
                      padding: "0",
                    }}
                  >
                    Click to Disconnect
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Card>
    </>
  );
};

export default Connections;