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
import { signInWithRedirect, signUp, autoSignIn } from "aws-amplify/auth";

const SignUpForm: React.FC = () => {
  const router = useRouter();
  const [showEmailSignup, setShowEmailSignup] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Real Google SSO handler
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithRedirect({
        provider: 'Google',
      });
      // User will be redirected to Google - no code runs after this
    } catch (err: any) {
      console.error('Google sign up error:', err);
      setError(err.message || 'Failed to sign up with Google');
      setLoading(false);
    }
  };

  // Real email/password sign up handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            name: name,
            email: email,
          },
          autoSignIn: true, // Enable auto sign-in after confirmation
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setSuccess(
          `Account created! Please check your email (${email}) for a confirmation code. You'll be redirected to sign in.`
        );

        // Redirect to sign-in after 5 seconds
        setTimeout(() => {
          router.push('/authentication/sign-in');
        }, 5000);
      } else if (nextStep.signUpStep === 'DONE') {
        // Auto sign-in was successful
        setSuccess('Account created and signed in successfully!');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Sign up error:', err);

      // Handle specific errors
      if (err.name === 'UsernameExistsException') {
        setError('An account with this email already exists.');
      } else if (err.name === 'InvalidPasswordException') {
        setError('Password does not meet requirements. Must be at least 8 characters.');
      } else if (err.name === 'InvalidParameterException') {
        setError('Invalid email or password format.');
      } else {
        setError(err.message || 'Failed to create account');
      }

      setLoading(false);
    }
  };

  const toggleEmailSignup = () => {
    setShowEmailSignup(!showEmailSignup);
    setError(""); // Clear errors when toggling
    setSuccess(""); // Clear success messages
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
        px: 2,
        py: 4,
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
            Create your account
          </Typography>
          <Typography
            sx={{
              color: "#666",
              fontSize: "16px",
              fontWeight: 400,
            }}
          >
            Get started in just a few clicks
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

        {/* Success Alert */}
        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderRadius: "8px",
              border: "1px solid #e8f5e9",
            }}
          >
            {success}
          </Alert>
        )}

        {/* Google Sign Up Button */}
        <Button
          variant="outlined"
          onClick={handleGoogleSignUp}
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

        {/* Toggle Email Signup */}
        <Button
          onClick={toggleEmailSignup}
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
          {showEmailSignup ? "Hide email sign up" : "Continue with email"}
        </Button>

        {/* Collapsible Email Form */}
        <Collapse in={showEmailSignup}>
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
                Full name
              </Typography>
              <TextField
                placeholder="Johnny Doe"
                variant="outlined"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="At least 8 characters"
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

            <Box mb={3}>
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
                Confirm password
              </Typography>
              <TextField
                placeholder="Re-enter your password"
                variant="outlined"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </Box>
        </Collapse>

        {/* Sign In Link */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography
            sx={{
              color: "#666",
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            Already have an account?{" "}
            <Link
              href="/authentication/sign-in/"
              style={{
                color: "#1a1a1a",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SignUpForm;
