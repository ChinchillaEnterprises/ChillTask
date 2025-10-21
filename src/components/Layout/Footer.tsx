"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        py: 4,
        mt: 'auto',
      }}
    >
      <Box
        sx={{
          maxWidth: '900px',
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#999',
            fontSize: '13px',
            fontWeight: 400,
          }}
        >
          © {new Date().getFullYear()} Chill App. Built with Next.js and AWS Amplify.
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;
