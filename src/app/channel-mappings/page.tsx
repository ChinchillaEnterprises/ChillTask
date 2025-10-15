"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  Autocomplete,
  CircularProgress,
  Skeleton,
  Alert,
} from "@mui/material";
import { client } from "@/lib/amplify-client";
import type { Schema } from "@root/amplify/data/schema";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/providers/AuthProvider";

interface SlackChannel {
  id: string;
  name: string;
}

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
}

interface GitHubBranch {
  name: string;
  commitSha: string;
  isProtected: boolean;
}

export default function ChannelMappings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingMapping, setEditingMapping] = React.useState<Schema["ChannelMapping"]["type"] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingChannels, setLoadingChannels] = React.useState(false);
  const [loadingRepos, setLoadingRepos] = React.useState(false);
  const [loadingBranches, setLoadingBranches] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [syncing, setSyncing] = React.useState<string | null>(null); // Track which mapping is syncing
  const [syncMessage, setSyncMessage] = React.useState<{type: 'success' | 'error', text: string} | null>(null);
  const [slackChannels, setSlackChannels] = React.useState<SlackChannel[]>([]);
  const [githubRepos, setGithubRepos] = React.useState<GitHubRepo[]>([]);
  const [githubBranches, setGithubBranches] = React.useState<GitHubBranch[]>([]);
  const [mappings, setMappings] = React.useState<Schema["ChannelMapping"]["type"][]>([]);
  const [formErrors, setFormErrors] = React.useState({
    slackChannel: "",
    githubRepo: "",
    githubBranch: "",
    contextFolder: "",
  });

  const [formData, setFormData] = React.useState({
    slackChannel: "",
    slackChannelId: "",
    githubRepo: "",
    githubUrl: "",
    githubBranch: "main",
    contextFolder: "/context/",
  });

  // Fetch Slack channels from API
  const fetchSlackChannels = async () => {
    setLoadingChannels(true);
    try {
      const { data, errors } = await client.queries.getSlackChannels();
      if (errors) {
        console.error("Failed to fetch Slack channels:", errors);
      } else if (data) {
        setSlackChannels(data as SlackChannel[]);
      }
    } catch (error) {
      console.error("Unexpected error fetching Slack channels:", error);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Fetch GitHub repos from API
  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const { data, errors } = await client.queries.getGitHubRepos();
      if (errors) {
        console.error("Failed to fetch GitHub repos:", errors);
      } else if (data) {
        setGithubRepos(data as GitHubRepo[]);
      }
    } catch (error) {
      console.error("Unexpected error fetching GitHub repos:", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch GitHub branches for selected repo
  const fetchGitHubBranches = async (repoFullName: string) => {
    setLoadingBranches(true);
    setGithubBranches([]);
    try {
      const { data, errors } = await client.queries.getGitHubBranches({ repoFullName });
      if (errors) {
        console.error("Failed to fetch GitHub branches:", errors);
      } else if (data) {
        setGithubBranches(data as GitHubBranch[]);
        // If main branch exists, auto-select it
        const mainBranch = data.find((b) => b?.name === 'main');
        if (mainBranch) {
          setFormData(prev => ({ ...prev, githubBranch: 'main' }));
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching GitHub branches:", error);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Load initial channel mappings from Amplify
  React.useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    async function loadMappings() {
      try {
        const { data, errors } = await client.models.ChannelMapping.list();
        if (errors) {
          console.error("Failed to load channel mappings:", errors);
        } else {
          setMappings(data);
        }
      } catch (error) {
        console.error("Unexpected error loading mappings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMappings();
  }, [isAuthenticated, authLoading]);

  // Set up real-time subscriptions
  React.useEffect(() => {
    // Subscribe to new mappings
    const createSub = client.models.ChannelMapping.onCreate().subscribe({
      next: (newMapping) => {
        setMappings(prev => [...prev, newMapping]);
      },
      error: (error) => console.error("Create subscription error:", error),
    });

    // Subscribe to mapping updates
    const updateSub = client.models.ChannelMapping.onUpdate().subscribe({
      next: (updatedMapping) => {
        setMappings(prev =>
          prev.map(mapping =>
            mapping.id === updatedMapping.id ? updatedMapping : mapping
          )
        );
      },
      error: (error) => console.error("Update subscription error:", error),
    });

    // Subscribe to mapping deletes
    const deleteSub = client.models.ChannelMapping.onDelete().subscribe({
      next: (deletedMapping) => {
        setMappings(prev => prev.filter(mapping => mapping.id !== deletedMapping.id));
      },
      error: (error) => console.error("Delete subscription error:", error),
    });

    // Cleanup subscriptions
    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  const handleOpenDialog = (mapping?: Schema["ChannelMapping"]["type"]) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        slackChannel: mapping.slackChannel,
        slackChannelId: mapping.slackChannelId,
        githubRepo: mapping.githubRepo,
        githubUrl: mapping.githubUrl,
        githubBranch: mapping.githubBranch,
        contextFolder: mapping.contextFolder,
      });
      // Fetch branches for the selected repo
      if (mapping.githubUrl) {
        fetchGitHubBranches(mapping.githubUrl);
      }
    } else {
      setEditingMapping(null);
      setFormData({
        slackChannel: "",
        slackChannelId: "",
        githubRepo: "",
        githubUrl: "",
        githubBranch: "main",
        contextFolder: "/context/",
      });
      setGithubBranches([]);
    }
    setFormErrors({
      slackChannel: "",
      githubRepo: "",
      githubBranch: "",
      contextFolder: "",
    });
    setOpenDialog(true);

    // Fetch Slack channels and GitHub repos when dialog opens
    fetchSlackChannels();
    fetchGitHubRepos();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMapping(null);
    setFormData({
      slackChannel: "",
      slackChannelId: "",
      githubRepo: "",
      githubUrl: "",
      githubBranch: "main",
      contextFolder: "/context/",
    });
    setGithubBranches([]);
    setFormErrors({
      slackChannel: "",
      githubRepo: "",
      githubBranch: "",
      contextFolder: "",
    });
  };

  const validateForm = () => {
    const errors = {
      slackChannel: "",
      githubRepo: "",
      githubBranch: "",
      contextFolder: "",
    };
    let isValid = true;

    if (!formData.slackChannel) {
      errors.slackChannel = "Slack channel is required";
      isValid = false;
    }

    if (!formData.githubRepo) {
      errors.githubRepo = "GitHub repository is required";
      isValid = false;
    }

    if (!formData.githubBranch) {
      errors.githubBranch = "GitHub branch is required";
      isValid = false;
    }

    if (!formData.contextFolder) {
      errors.contextFolder = "Context folder is required";
      isValid = false;
    } else if (!formData.contextFolder.startsWith('/')) {
      errors.contextFolder = "Context folder must start with /";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      if (editingMapping) {
        // Update existing mapping
        const { errors } = await client.models.ChannelMapping.update({
          id: editingMapping.id,
          ...formData,
        });

        if (errors) {
          console.error("Failed to update mapping:", errors);
          alert("Failed to update mapping");
          return;
        }
      } else {
        // Create new mapping
        const { errors } = await client.models.ChannelMapping.create({
          ...formData,
          isActive: true,
        });

        if (errors) {
          console.error("Failed to create mapping:", errors);
          alert("Failed to create mapping");
          return;
        }
      }

      handleCloseDialog();
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { errors } = await client.models.ChannelMapping.delete({ id });

      if (errors) {
        console.error("Failed to delete mapping:", errors);
        alert("Failed to delete mapping");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { errors } = await client.models.ChannelMapping.update({
        id,
        isActive: !currentStatus,
      });

      if (errors) {
        console.error("Failed to toggle active status:", errors);
        alert("Failed to toggle active status");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  const handleSyncHistory = async (channelId: string, mappingId: string) => {
    setSyncing(mappingId);
    setSyncMessage(null);

    try {
      const { data, errors } = await client.mutations.syncSlackHistory({ channelId });

      if (errors) {
        console.error("Failed to sync Slack history:", errors);
        setSyncMessage({ type: 'error', text: 'Failed to sync history' });
      } else if (data) {
        const result = data as any;
        if (result.success) {
          setSyncMessage({
            type: 'success',
            text: `Synced ${result.messagesSynced} messages in ${result.threadsProcessed} threads`
          });
        } else {
          setSyncMessage({ type: 'error', text: result.message || 'Sync failed' });
        }
      }
    } catch (error) {
      console.error("Unexpected error syncing history:", error);
      setSyncMessage({ type: 'error', text: 'An error occurred during sync' });
    } finally {
      setSyncing(null);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ p: 3 }}>
          {/* Header Skeleton */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="300px" height={50} />
              <Skeleton variant="text" width="500px" height={30} />
            </Box>
            <Skeleton variant="rectangular" width={180} height={45} sx={{ borderRadius: 1 }} />
          </Box>

          {/* Mapping List Skeletons */}
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Skeleton variant="rectangular" width={220} height={60} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton variant="rectangular" width={220} height={60} sx={{ borderRadius: 1 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                </Box>
              </Box>
              {i < 3 && <Box sx={{ height: '1px', backgroundColor: 'divider', mt: 3 }} />}
            </Box>
          ))}
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
      {/* Sync Message Alert */}
      {syncMessage && (
        <Alert
          severity={syncMessage.type}
          sx={{ mb: 3 }}
          onClose={() => setSyncMessage(null)}
        >
          {syncMessage.text}
        </Alert>
      )}

      {/* Header */}
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
          Channel Mappings
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
          Map Slack channels to GitHub repositories for automatic context archiving
        </Typography>

        {/* Add New Mapping Button */}
        <Button
          variant="contained"
          size="large"
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            py: 1.5,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#333',
              boxShadow: 'none',
            }
          }}
        >
          + Add New Mapping
        </Button>
      </Box>

      {/* Mappings List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {mappings.map((mapping, index) => (
          <React.Fragment key={mapping.id}>
            <Box
              sx={{
                py: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  px: 2,
                  mx: -2,
                  borderRadius: 1,
                }
              }}
            >
              {/* Main Row: Slack Channel → GitHub Repo */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left: Slack Channel → GitHub Repo Flow */}
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {/* Slack Channel */}
                  <Box sx={{ minWidth: 220 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <i className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563eb' }}>tag</i>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {mapping.slackChannel}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 3 }}>
                      {mapping.slackChannelId}
                    </Typography>
                  </Box>

                  {/* Arrow */}
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    <i className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      arrow_forward
                    </i>
                  </Box>

                  {/* GitHub Repo */}
                  <Box sx={{ minWidth: 220 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <i className="material-symbols-outlined" style={{ fontSize: '18px', color: '#22c55e' }}>folder</i>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {mapping.githubRepo}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 3 }}>
                      {mapping.githubUrl}
                    </Typography>
                  </Box>
                </Box>

                {/* Right: Status & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={mapping.isActive ? "Active" : "Inactive"}
                    size="small"
                    color={mapping.isActive ? "success" : "default"}
                    sx={{
                      fontWeight: 600,
                      minWidth: 80,
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!mapping.isActive || syncing === mapping.id}
                    onClick={() => handleSyncHistory(mapping.slackChannelId, mapping.id)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 1,
                      px: 2,
                      minWidth: 100,
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      }
                    }}
                    startIcon={
                      syncing === mapping.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <i className="material-symbols-outlined" style={{ fontSize: '18px' }}>sync</i>
                      )
                    }
                  >
                    {syncing === mapping.id ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(mapping)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.main'
                      }
                    }}
                  >
                    <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</i>
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(mapping.id)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'error.light',
                        color: 'error.main'
                      }
                    }}
                  >
                    <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</i>
                  </IconButton>
                </Box>
              </Box>

              {/* Activity Metadata */}
              <Box sx={{ mt: 2, ml: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10b981' }}>schedule</i>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Last sync: {formatTimestamp(mapping.lastSync)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className="material-symbols-outlined" style={{ fontSize: '16px', color: '#3b82f6' }}>chat</i>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {mapping.messageCount || 0} messages archived
                  </Typography>
                </Box>
                {mapping.githubBranch && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8b5cf6' }}>account_tree</i>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      Branch: {mapping.githubBranch}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Divider */}
            {index < mappings.length - 1 && (
              <Box
                sx={{
                  height: '1px',
                  backgroundColor: 'divider',
                  width: '100%',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Empty State */}
      {mappings.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <i className="material-symbols-outlined" style={{ fontSize: '64px', color: '#cbd5e1', opacity: 0.7 }}>
            link_off
          </i>
          <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            No Channel Mappings Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Create your first mapping to start archiving Slack conversations to GitHub
          </Typography>
          <Button
            variant="contained"
            onClick={() => handleOpenDialog()}
            sx={{ textTransform: 'none' }}
          >
            Create First Mapping
          </Button>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 600, fontSize: '20px' }}>
            {editingMapping ? 'Edit Channel Mapping' : 'Add New Channel Mapping'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <FormControl fullWidth error={!!formErrors.slackChannel}>
                <Typography
                  component="label"
                  sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Slack Channel Name
                </Typography>
                <Autocomplete
                  options={slackChannels}
                  getOptionLabel={(option) => option.name}
                  loading={loadingChannels}
                  value={slackChannels.find(ch => ch.name === formData.slackChannel) || null}
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      slackChannel: newValue?.name || '',
                      slackChannelId: newValue?.id || ''
                    });
                    setFormErrors({ ...formErrors, slackChannel: '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select a Slack channel"
                      variant="filled"
                      required={!formData.slackChannel}
                      error={!!formErrors.slackChannel}
                      helperText={formErrors.slackChannel}
                      sx={{
                        '& .MuiInputBase-root': {
                          border: `1px solid ${formErrors.slackChannel ? '#d32f2f' : '#D5D9E2'}`,
                          backgroundColor: '#fff',
                          borderRadius: '7px',
                        },
                        '& .MuiInputBase-root::before': {
                          border: 'none',
                        },
                        '& .MuiInputBase-root:hover::before': {
                          border: 'none',
                        },
                      }}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingChannels ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': {
                      color: '#2563eb',
                    },
                  }}
                />
              </FormControl>

              <FormControl fullWidth error={!!formErrors.githubRepo}>
                <Typography
                  component="label"
                  sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  GitHub Repository Name
                </Typography>
                <Autocomplete
                  options={githubRepos}
                  getOptionLabel={(option) => option.name}
                  loading={loadingRepos}
                  value={githubRepos.find(repo => repo.name === formData.githubRepo) || null}
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      githubRepo: newValue?.name || '',
                      githubUrl: newValue?.fullName || '',
                      githubBranch: 'main', // Reset branch when repo changes
                    });
                    setFormErrors({ ...formErrors, githubRepo: '' });
                    // Fetch branches for newly selected repo
                    if (newValue?.fullName) {
                      fetchGitHubBranches(newValue.fullName);
                    } else {
                      setGithubBranches([]);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select a GitHub repository"
                      variant="filled"
                      required={!formData.githubRepo}
                      error={!!formErrors.githubRepo}
                      helperText={formErrors.githubRepo}
                      sx={{
                        '& .MuiInputBase-root': {
                          border: `1px solid ${formErrors.githubRepo ? '#d32f2f' : '#D5D9E2'}`,
                          backgroundColor: '#fff',
                          borderRadius: '7px',
                        },
                        '& .MuiInputBase-root::before': {
                          border: 'none',
                        },
                        '& .MuiInputBase-root:hover::before': {
                          border: 'none',
                        },
                      }}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingRepos ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {option.fullName}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': {
                      color: '#2563eb',
                    },
                  }}
                />
              </FormControl>

              <FormControl fullWidth error={!!formErrors.githubBranch}>
                <Typography
                  component="label"
                  sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  GitHub Branch
                </Typography>
                {formData.githubUrl && githubBranches.length > 0 ? (
                  <Autocomplete
                    options={githubBranches}
                    getOptionLabel={(option) => option.name}
                    loading={loadingBranches}
                    value={githubBranches.find(b => b.name === formData.githubBranch) || null}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, githubBranch: newValue?.name || 'main' });
                      setFormErrors({ ...formErrors, githubBranch: '' });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select a branch"
                        variant="filled"
                        required
                        error={!!formErrors.githubBranch}
                        helperText={formErrors.githubBranch}
                        sx={{
                          '& .MuiInputBase-root': {
                            border: `1px solid ${formErrors.githubBranch ? '#d32f2f' : '#D5D9E2'}`,
                            backgroundColor: '#fff',
                            borderRadius: '7px',
                          },
                          '& .MuiInputBase-root::before': {
                            border: 'none',
                          },
                          '& .MuiInputBase-root:hover::before': {
                            border: 'none',
                          },
                        }}
                        slotProps={{
                          input: {
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingBranches ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          },
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.commitSha}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8b5cf6' }}>account_tree</i>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.name}
                          </Typography>
                          {option.isProtected && (
                            <Chip label="Protected" size="small" color="warning" sx={{ height: 20, fontSize: '10px' }} />
                          )}
                        </Box>
                      </li>
                    )}
                    sx={{
                      '& .MuiAutocomplete-popupIndicator': {
                        color: '#2563eb',
                      },
                    }}
                  />
                ) : (
                  <TextField
                    placeholder="main"
                    variant="filled"
                    required
                    value={formData.githubBranch}
                    onChange={(e) => {
                      setFormData({ ...formData, githubBranch: e.target.value });
                      setFormErrors({ ...formErrors, githubBranch: '' });
                    }}
                    error={!!formErrors.githubBranch}
                    helperText={formErrors.githubBranch || (formData.githubUrl ? "Loading branches..." : "Select a repository first")}
                    disabled={!formData.githubUrl || loadingBranches}
                    sx={{
                      '& .MuiInputBase-root': {
                        border: `1px solid ${formErrors.githubBranch ? '#d32f2f' : '#D5D9E2'}`,
                        backgroundColor: '#fff',
                        borderRadius: '7px',
                      },
                      '& .MuiInputBase-root::before': {
                        border: 'none',
                      },
                      '& .MuiInputBase-root:hover::before': {
                        border: 'none',
                      },
                    }}
                  />
                )}
              </FormControl>

              <FormControl fullWidth error={!!formErrors.contextFolder}>
                <Typography
                  component="label"
                  sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Context Folder Path
                </Typography>
                <TextField
                  placeholder="/context/"
                  variant="filled"
                  required
                  value={formData.contextFolder}
                  onChange={(e) => {
                    setFormData({ ...formData, contextFolder: e.target.value });
                    setFormErrors({ ...formErrors, contextFolder: '' });
                  }}
                  error={!!formErrors.contextFolder}
                  helperText={formErrors.contextFolder || "Path must start with /"}
                  sx={{
                    '& .MuiInputBase-root': {
                      border: `1px solid ${formErrors.contextFolder ? '#d32f2f' : '#D5D9E2'}`,
                      backgroundColor: '#fff',
                      borderRadius: '7px',
                    },
                    '& .MuiInputBase-root::before': {
                      border: 'none',
                    },
                    '& .MuiInputBase-root:hover::before': {
                      border: 'none',
                    },
                  }}
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleCloseDialog}
              disabled={submitting}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !formData.slackChannel || !formData.githubRepo || !formData.githubBranch || !formData.contextFolder}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                minWidth: 160,
              }}
            >
              {submitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>{editingMapping ? 'Updating...' : 'Creating...'}</span>
                </Box>
              ) : (
                editingMapping ? 'Update Mapping' : 'Create Mapping'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Sync Message Alert */}
      {syncMessage && (
        <Alert
          severity={syncMessage.type}
          sx={{ position: 'fixed', bottom: 24, right: 24, minWidth: 300 }}
          onClose={() => setSyncMessage(null)}
        >
          {syncMessage.text}
        </Alert>
      )}
      </Box>
    </DashboardLayout>
  );
}
