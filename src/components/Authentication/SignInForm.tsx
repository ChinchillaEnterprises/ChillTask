"use client";

import * as React from "react";
import {
  Button,
  Box,
  Typography,
  TextField,
  Collapse,
  Alert,
  Divider,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithRedirect, signIn } from "aws-amplify/auth";
import { useAuth } from "@/providers/AuthProvider";

const SignInForm: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showEmailLogin, setShowEmailLogin] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Redirect authenticated users away from sign-in page
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('[SignInForm] User already authenticated, redirecting to home');
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Real Google SSO handler
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithRedirect({
        provider: 'Google',
      });
      // User will be redirected to Google - no code runs after this
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  // Real email/password sign in handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password,
      });

      if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        setError('Please confirm your email first. Check your inbox for a confirmation code.');
        setLoading(false);
        return;
      }

      if (nextStep.signInStep === 'DONE' && isSignedIn) {
        // Successfully signed in - redirect to home
        router.push("/");
      }
    } catch (err: any) {
      console.error('Sign in error:', err);

      // Handle specific errors
      if (err.name === 'UserNotFoundException') {
        setError('No account found with this email.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (err.name === 'UserNotConfirmedException') {
        setError('Please confirm your email first.');
      } else {
        setError(err.message || 'Failed to sign in');
      }

      setLoading(false);
    }
  };

  const toggleEmailLogin = () => {
    setShowEmailLogin(!showEmailLogin);
    setError(""); // Clear errors when toggling
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#fafafa",
        }}
      >
        <Typography sx={{ color: "#666" }}>Checking authentication...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#fff",
          borderRadius: "16px",
          border: "1px solid #e0e0e0",
          p: { xs: 4, sm: 5 },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: "28px", sm: "32px" },
              letterSpacing: "-0.02em",
              color: "#1a1a1a",
            }}
          >
            Welcome back
          </Typography>
          <Typography
            sx={{
              color: "#666",
              fontSize: "16px",
              fontWeight: 400,
            }}
          >
            Sign in to continue to your account
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: "8px",
              border: "1px solid #ffebee",
            }}
          >
            {error}
          </Alert>
        )}

        {/* Google Sign In Button */}
        <Button
          variant="outlined"
          onClick={handleGoogleLogin}
          disabled={loading}
          fullWidth
          sx={{
            py: 1.5,
            borderRadius: "12px",
            border: "1px solid #e0e0e0",
            backgroundColor: "#fff",
            color: "#1a1a1a",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            "&:hover": {
              backgroundColor: "#f9f9f9",
              borderColor: "#d0d0d0",
            },
            "&.Mui-disabled": {
              backgroundColor: "#f5f5f5",
              borderColor: "#e0e0e0",
            },
          }}
        >
          <Image
            src="/images/icons/google.svg"
            alt="google"
            width={20}
            height={20}
          />
          {loading ? "Redirecting..." : "Continue with Google"}
        </Button>

        {/* Divider */}
        <Box sx={{ my: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <Divider sx={{ flex: 1, borderColor: "#e0e0e0" }} />
          <Typography
            sx={{
              color: "#999",
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            OR
          </Typography>
          <Divider sx={{ flex: 1, borderColor: "#e0e0e0" }} />
        </Box>

        {/* Toggle Email Login */}
        <Button
          onClick={toggleEmailLogin}
          fullWidth
          sx={{
            textTransform: "none",
            color: "#666",
            fontSize: "14px",
            fontWeight: 500,
            py: 1,
            "&:hover": {
              backgroundColor: "transparent",
              color: "#1a1a1a",
            },
          }}
        >
          {showEmailLogin ? "Hide email sign in" : "Continue with email"}
        </Button>

        {/* Collapsible Email Form */}
        <Collapse in={showEmailLogin}>
          <Box
            component="form"
            onSubmit={handleFormSubmit}
            sx={{ mt: 3 }}
          >
            <Box mb={2}>
              <Typography
                component="label"
                sx={{
                  fontWeight: 500,
                  fontSize: "14px",
                  mb: 1,
                  display: "block",
                  color: "#1a1a1a",
                }}
              >
                Email
              </Typography>
              <TextField
                placeholder="you@example.com"
                variant="outlined"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    fontSize: "15px",
                    "& fieldset": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover fieldset": {
                      borderColor: "#d0d0d0",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#1a1a1a",
                      borderWidth: "1px",
                    },
                  },
                }}
              />
            </Box>

            <Box mb={2}>
              <Typography
                component="label"
                sx={{
                  fontWeight: 500,
                  fontSize: "14px",
                  mb: 1,
                  display: "block",
                  color: "#1a1a1a",
                }}
              >
                Password
              </Typography>
              <TextField
                placeholder="Enter your password"
                variant="outlined"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    fontSize: "15px",
                    "& fieldset": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover fieldset": {
                      borderColor: "#d0d0d0",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#1a1a1a",
                      borderWidth: "1px",
                    },
                  },
                }}
              />
            </Box>

            <Box mb={3} sx={{ textAlign: "right" }}>
              <Link
                href="/authentication/forgot-password/"
                style={{
                  color: "#666",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              sx={{
                py: 1.5,
                textTransform: "none",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "16px",
                backgroundColor: "#1a1a1a",
                color: "#fff",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#000",
                  boxShadow: "none",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#e0e0e0",
                  color: "#999",
                },
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>
        </Collapse>

        {/* Sign Up Link */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography
            sx={{
              color: "#666",
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            Don't have an account?{" "}
            <Link
              href="/authentication/sign-up/"
              style={{
                color: "#1a1a1a",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SignInForm;
