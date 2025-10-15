"use client";

import * as React from "react";
import {
  Grid,
  Button,
  Box,
  Typography,
  FormControl,
  TextField,
  Alert,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmResetPassword } from "aws-amplify/auth";

const ResetPasswordForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(emailFromUrl);
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });

      setSuccess('Password reset successfully! Redirecting to sign in...');

      // Redirect to sign-in after 2 seconds
      setTimeout(() => {
        router.push('/authentication/sign-in');
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);

      if (err.name === 'CodeMismatchException') {
        setError('Invalid or expired code. Please request a new one.');
      } else if (err.name === 'InvalidPasswordException') {
        setError('Password does not meet requirements. Must be at least 8 characters.');
      } else if (err.name === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to reset password');
      }

      setLoading(false);
    }
  };

  return (
    <>
      <Box
        className="auth-main-wrapper reset-password-area"
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
                  alt="reset-password-image"
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
                    Reset your password
                  </Typography>

                  <Typography sx={{ fontWeight: "500", fontSize: "16px" }}>
                    Enter the code from your email and create a new password
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
                        Verification Code
                      </Typography>

                      <TextField
                        label="Enter code from email"
                        variant="filled"
                        id="code"
                        name="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
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
                        New Password
                      </Typography>

                      <TextField
                        label="At least 8 characters"
                        variant="filled"
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                        Confirm New Password
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

                        "&.Mui-disabled": {
                          backgroundColor: "#000",
                          color: "#9e9e9e !important",
                          cursor: "not-allowed",
                        },
                      }}
                    >
                      <i className="material-symbols-outlined mr-5">lock_reset</i>
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </Box>

                  <Typography sx={{ textAlign: "center" }}>
                    Remember your password?{" "}
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
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default ResetPasswordForm;
