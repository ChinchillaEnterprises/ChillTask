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
} from "@mui/material";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import outputs from "../../../amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });

const client = generateClient<Schema>();

interface SlackChannel {
  id: string;
  name: string;
}

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
}

export default function ChannelMappings() {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingMapping, setEditingMapping] = React.useState<Schema["ChannelMapping"]["type"] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingChannels, setLoadingChannels] = React.useState(false);
  const [loadingRepos, setLoadingRepos] = React.useState(false);
  const [slackChannels, setSlackChannels] = React.useState<SlackChannel[]>([]);
  const [githubRepos, setGithubRepos] = React.useState<GitHubRepo[]>([]);
  const [mappings, setMappings] = React.useState<Schema["ChannelMapping"]["type"][]>([]);

  const [formData, setFormData] = React.useState({
    slackChannel: "",
    slackChannelId: "",
    githubRepo: "",
    githubUrl: "",
    githubBranch: "main",
    contextFolder: "/context/",
  });

  // Mock function to fetch Slack channels
  const fetchSlackChannels = async () => {
    setLoadingChannels(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock Slack channels data
    const mockChannels: SlackChannel[] = [
      { id: "C001", name: "Internal-Geico" },
      { id: "C002", name: "Internal-Toyota" },
      { id: "C003", name: "Internal-Tesla" },
      { id: "C004", name: "Internal-Ford" },
      { id: "C005", name: "Internal-BMW" },
      { id: "C006", name: "Internal-Mercedes" },
      { id: "C007", name: "Internal-Apple" },
      { id: "C008", name: "Internal-Microsoft" },
      { id: "C009", name: "Internal-Amazon" },
      { id: "C010", name: "Internal-Google" },
      { id: "C011", name: "team-engineering" },
      { id: "C012", name: "team-design" },
      { id: "C013", name: "team-marketing" },
      { id: "C014", name: "random" },
      { id: "C015", name: "general" },
    ];

    setSlackChannels(mockChannels);
    setLoadingChannels(false);
  };

  // Mock function to fetch GitHub repos
  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock GitHub repos data
    const mockRepos: GitHubRepo[] = [
      { id: "R001", name: "Geico-client", fullName: "github.com/ChinchillaEnterprises/Geico-client" },
      { id: "R002", name: "Toyota-project", fullName: "github.com/ChinchillaEnterprises/Toyota-project" },
      { id: "R003", name: "Tesla-app", fullName: "github.com/ChinchillaEnterprises/Tesla-app" },
      { id: "R004", name: "Ford-platform", fullName: "github.com/ChinchillaEnterprises/Ford-platform" },
      { id: "R005", name: "BMW-integration", fullName: "github.com/ChinchillaEnterprises/BMW-integration" },
      { id: "R006", name: "Mercedes-dashboard", fullName: "github.com/ChinchillaEnterprises/Mercedes-dashboard" },
      { id: "R007", name: "Apple-services", fullName: "github.com/ChinchillaEnterprises/Apple-services" },
      { id: "R008", name: "Microsoft-connector", fullName: "github.com/ChinchillaEnterprises/Microsoft-connector" },
      { id: "R009", name: "Amazon-backend", fullName: "github.com/ChinchillaEnterprises/Amazon-backend" },
      { id: "R010", name: "Google-api", fullName: "github.com/ChinchillaEnterprises/Google-api" },
      { id: "R011", name: "client-portal", fullName: "github.com/ChinchillaEnterprises/client-portal" },
      { id: "R012", name: "admin-console", fullName: "github.com/ChinchillaEnterprises/admin-console" },
      { id: "R013", name: "analytics-engine", fullName: "github.com/ChinchillaEnterprises/analytics-engine" },
      { id: "R014", name: "mobile-app", fullName: "github.com/ChinchillaEnterprises/mobile-app" },
      { id: "R015", name: "api-gateway", fullName: "github.com/ChinchillaEnterprises/api-gateway" },
    ];

    setGithubRepos(mockRepos);
    setLoadingRepos(false);
  };

  // Load initial channel mappings from Amplify
  React.useEffect(() => {
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
  }, []);

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
    }
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            🔗 Channel Mappings
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            Map Slack channels to GitHub repositories for automatic context archiving
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: 'primary.main',
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.2,
            '&:hover': {
              backgroundColor: 'primary.dark',
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
              {(mapping.lastSync || mapping.messageCount !== undefined) && (
                <Box sx={{ mt: 1.5, ml: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b' }}>auto_awesome</i>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Last sync: {mapping.lastSync || 'Never'} • {mapping.messageCount || 0} messages archived
                  </Typography>
                </Box>
              )}
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
              <FormControl fullWidth>
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
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select a Slack channel"
                      variant="filled"
                      required={!formData.slackChannel}
                      sx={{
                        '& .MuiInputBase-root': {
                          border: '1px solid #D5D9E2',
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

              <FormControl fullWidth>
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
                      githubUrl: newValue?.fullName || ''
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select a GitHub repository"
                      variant="filled"
                      required={!formData.githubRepo}
                      sx={{
                        '& .MuiInputBase-root': {
                          border: '1px solid #D5D9E2',
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

              <FormControl fullWidth>
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
                <TextField
                  placeholder="main"
                  variant="filled"
                  required
                  value={formData.githubBranch}
                  onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': {
                      border: '1px solid #D5D9E2',
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

              <FormControl fullWidth>
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
                  onChange={(e) => setFormData({ ...formData, contextFolder: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': {
                      border: '1px solid #D5D9E2',
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
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
              }}
            >
              {editingMapping ? 'Update Mapping' : 'Create Mapping'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
