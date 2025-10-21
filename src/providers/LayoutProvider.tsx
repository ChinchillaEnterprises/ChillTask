"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Box } from "@mui/material";
import MinimalTopNav from "@/components/Layout/MinimalTopNav";
import Footer from "@/components/Layout/Footer";
interface LayoutProviderProps {
  children: ReactNode;
}

const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const pathname = usePathname();

  const isAuthPage = [
    "/authentication/sign-in",
    "/authentication/sign-in/",
    "/authentication/sign-up",
    "/authentication/sign-up/",
    "/authentication/forgot-password",
    "/authentication/forgot-password/",
  ].includes(pathname);

  // ChillTask uses public access - no authentication required
  const layoutMode = 'dashboard';

  // Determine max-width based on page type (Material-UI standards)
  const getMaxWidth = () => {
    // Dashboard pages need more horizontal space
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' };
    }

    // Content pages use comfortable reading width
    // Home, News, Settings, etc.
    return { xs: '100%', sm: '100%', md: '900px' };
  };

  return (
    <>
      {/* Show nav only if not on auth pages */}
      {!isAuthPage && <MinimalTopNav mode={layoutMode} />}

      {/* Global content wrapper with responsive max-width */}
      <Box
        sx={{
          minHeight: isAuthPage ? '100vh' : 'calc(100vh - 64px)',
          backgroundColor: '#fafafa',
        }}
      >
        {!isAuthPage ? (
          // Wrapped content with responsive max-width
          <Box
            sx={{
              maxWidth: getMaxWidth(),
              mx: 'auto',
              px: { xs: 2, sm: 3 },
              py: { xs: 4, sm: 6, md: 8 },
            }}
          >
            {children}
          </Box>
        ) : (
          // Auth pages render full-width (no wrapper)
          children
        )}
      </Box>

      {/* Footer - only show on non-auth pages */}
      {!isAuthPage && <Footer />}
    </>
  );
};

export default LayoutProvider;
