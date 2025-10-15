"use client";

import * as React from "react";
import {
  Grid,
  Button,
  Box,
  Typography,
  FormControl,
  TextField,
  Collapse,
  Alert,
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
    <>
      <Box
        className="auth-main-wrapper sign-up-area"
        sx={{
          py: { xs: "60px", md: "80px", lg: "100px", xl: "135px" },
        }}
      >
        <Box
          sx={{
            maxWidth: { sm: "500px", md: "1255px" },
            mx: "auto !important",
            px: "12px",
          }}
        >
          <Grid
            container
            alignItems="center"
            columnSpacing={{ xs: 1, sm: 2, md: 4, lg: 3 }}
          >
            <Grid size={{ xs: 12, md: 6, lg: 6, xl: 7 }}>
              <Box
                sx={{
                  display: { xs: "none", md: "block" },
                }}
              >
                <Image
                  src="/images/sign-in.jpg"
                  alt="sign-up-image"
                  width={646}
                  height={804}
                  style={{
                    borderRadius: "24px",
                  }}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 6, xl: 5 }}>
              <Box
                className="form-content"
                sx={{
                  paddingLeft: { xs: "0", lg: "10px" },
                }}
              >
                <Box
                  className="logo"
                  sx={{
                    mb: "23px",
                  }}
                >
                  <Image
                    src="/images/logo-big.svg"
                    alt="logo"
                    width={142}
                    height={38}
                  />
                  <Image
                    src="/images/white-logo.svg"
                    className="d-none"
                    alt="logo"
                    width={142}
                    height={38}
                  />
                </Box>

                <Box
                  className="title"
                  sx={{
                    mb: "23px",
                  }}
                >
                  <Typography
                    variant="h1"
                    className="text-black"
                    sx={{
                      fontSize: { xs: "22px", sm: "25px", lg: "28px" },
                      mb: "7px",
                      fontWeight: "600",
                    }}
                  >
                    Join Chill App today!
                  </Typography>

                  <Typography sx={{ fontWeight: "500", fontSize: "16px" }}>
                    Sign up with social account or enter your details
                  </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Success Alert */}
                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}

                <Box
                  className="with-socials"
                  sx={{
                    mb: "20px",
                  }}
                >
                  <Button
                    variant="outlined"
                    className="border bg-white"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    sx={{
                      width: "100%",
                      borderRadius: "8px",
                      padding: "10.5px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <Image
                      src="/images/icons/google.svg"
                      alt="google"
                      width={25}
                      height={25}
                    />
                    <Typography sx={{ fontWeight: 500, color: "#757575" }}>
                      {loading ? "Redirecting..." : "Sign up with Google"}
                    </Typography>
                  </Button>
                </Box>

                {/* Divider with OR text */}
                <Box sx={{ my: 3, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontSize: "14px",
                      mb: 2
                    }}
                  >
                    ──── OR ────
                  </Typography>

                  {/* Toggle link for email signup */}
                  <Button
                    onClick={toggleEmailSignup}
                    sx={{
                      textTransform: "none",
                      color: "#605dff",
                      fontSize: "14px",
                      fontWeight: 500,
                      "&:hover": {
                        backgroundColor: "transparent",
                        textDecoration: "underline"
                      }
                    }}
                    startIcon={
                      <Typography sx={{ fontSize: "16px" }}>
                        {showEmailSignup ? "▲" : "▼"}
                      </Typography>
                    }
                  >
                    Use email instead
                  </Button>
                </Box>

                {/* Collapsible email form */}
                <Collapse in={showEmailSignup}>
                  <Box
                    component="form"
                    onSubmit={handleFormSubmit}
                  >
                    <Box mb="15px">
                      <FormControl fullWidth>
                        <Typography
                          component="label"
                          sx={{
                            fontWeight: "500",
                            fontSize: "14px",
                            mb: "10px",
                            display: "block",
                          }}
                          className="text-black"
                        >
                          Full Name
                        </Typography>

                        <TextField
                          label="Johnny Doe"
                          variant="filled"
                          id="name"
                          name="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          disabled={loading}
                          sx={{
                            "& .MuiInputBase-root": {
                              border: "1px solid #D5D9E2",
                              backgroundColor: "#fff",
                              borderRadius: "7px",
                            },
                            "& .MuiInputBase-root::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                              {
                                border: "none",
                              },
                          }}
                        />
                      </FormControl>
                    </Box>

                    <Box mb="15px">
                      <FormControl fullWidth>
                        <Typography
                          component="label"
                          sx={{
                            fontWeight: "500",
                            fontSize: "14px",
                            mb: "10px",
                            display: "block",
                          }}
                          className="text-black"
                        >
                          Email Address
                        </Typography>

                        <TextField
                          label="example&#64;trezo.com"
                          variant="filled"
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          sx={{
                            "& .MuiInputBase-root": {
                              border: "1px solid #D5D9E2",
                              backgroundColor: "#fff",
                              borderRadius: "7px",
                            },
                            "& .MuiInputBase-root::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                              {
                                border: "none",
                              },
                          }}
                        />
                      </FormControl>
                    </Box>

                    <Box mb="15px">
                      <FormControl fullWidth>
                        <Typography
                          component="label"
                          sx={{
                            fontWeight: "500",
                            fontSize: "14px",
                            mb: "10px",
                            display: "block",
                          }}
                          className="text-black"
                        >
                          Password
                        </Typography>

                        <TextField
                          label="At least 8 characters"
                          variant="filled"
                          type="password"
                          id="password"
                          name="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          sx={{
                            "& .MuiInputBase-root": {
                              border: "1px solid #D5D9E2",
                              backgroundColor: "#fff",
                              borderRadius: "7px",
                            },
                            "& .MuiInputBase-root::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                              {
                                border: "none",
                              },
                          }}
                        />
                      </FormControl>
                    </Box>

                    <Box mb="20px">
                      <FormControl fullWidth>
                        <Typography
                          component="label"
                          sx={{
                            fontWeight: "500",
                            fontSize: "14px",
                            mb: "10px",
                            display: "block",
                          }}
                          className="text-black"
                        >
                          Confirm Password
                        </Typography>

                        <TextField
                          label="Re-enter password"
                          variant="filled"
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                          sx={{
                            "& .MuiInputBase-root": {
                              border: "1px solid #D5D9E2",
                              backgroundColor: "#fff",
                              borderRadius: "7px",
                            },
                            "& .MuiInputBase-root::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover::before": {
                              border: "none",
                            },
                            "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                              {
                                border: "none",
                              },
                          }}
                        />
                      </FormControl>
                    </Box>

                    <Box mb="20px">
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{
                          textTransform: "capitalize",
                          borderRadius: "6px",
                          fontWeight: "500",
                          fontSize: { xs: "13px", sm: "16px" },
                          padding: { xs: "10px 20px", sm: "10px 24px" },
                          color: "#fff !important",
                          boxShadow: "none",
                          width: "100%",

                          // Disabled state styles
                          "&.Mui-disabled": {
                            backgroundColor: "#000",
                            color: "#9e9e9e !important",
                            cursor: "not-allowed",
                          },
                        }}
                      >
                        <i className="material-symbols-outlined mr-5">person_add</i>
                        {loading ? "Creating Account..." : "Sign Up"}
                      </Button>
                    </Box>

                    <Typography>
                      Already have an account?{" "}
                      <Link
                        href="/authentication/sign-in/"
                        className="text-primary"
                        style={{
                          fontWeight: "500",
                        }}
                      >
                        Sign In
                      </Link>
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default SignUpForm;
