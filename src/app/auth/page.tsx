"use client";

import * as React from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Alert, 
  Chip, 
  Tab, 
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { generateClient } from "aws-amplify/data";
import { Amplify } from "aws-amplify";
import type { Schema } from "../../../amplify/data/resource";
import outputs from "../../../amplify_outputs.json";
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupIcon from '@mui/icons-material/Group';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';

// Configure Amplify
Amplify.configure(outputs);

// Generate the data client
const client = generateClient<Schema>();

interface User {
  username: string;
  email: string;
  givenName?: string;
  familyName?: string;
  status: string;
  enabled: boolean;
  createdAt?: string;
  lastModified?: string;
  groups?: string[];
}

interface Group {
  name: string;
  description?: string;
  precedence?: number;
  createdAt?: string;
  lastModified?: string;
  memberCount?: number;
}

type TabValue = 'users' | 'groups';

export default function AuthPage() {
  const [currentTab, setCurrentTab] = React.useState<TabValue>('users');
  const [users, setUsers] = React.useState<User[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  
  // User dialog states
  const [openUserDialog, setOpenUserDialog] = React.useState(false);
  const [userDialogMode, setUserDialogMode] = React.useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [userFormData, setUserFormData] = React.useState({
    email: '',
    givenName: '',
    familyName: '',
    temporaryPassword: '',
    suppressEmail: false
  });

  // Group dialog states
  const [openGroupDialog, setOpenGroupDialog] = React.useState(false);
  const [groupDialogMode, setGroupDialogMode] = React.useState<'create' | 'edit' | 'members'>('create');
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null);
  const [groupFormData, setGroupFormData] = React.useState({
    name: '',
    description: '',
    precedence: 0
  });
  const [groupMembers, setGroupMembers] = React.useState<User[]>([]);

  // User-Group management dialog
  const [openUserGroupDialog, setOpenUserGroupDialog] = React.useState(false);
  const [userGroups, setUserGroups] = React.useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = React.useState<string[]>([]);

  // Load users
  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.queries.authUserQuery({
        operation: 'LIST_USERS',
        input: { limit: 60 }
      });
      
      if (response.data?.users) {
        // For each user, get their groups
        const usersWithGroups = await Promise.all(
          (response.data.users as unknown as any[]).map(async (user) => {
            if (!user) return null;
            try {
              const groupsResponse = await client.queries.authUserQuery({
                operation: 'GET_USER_GROUPS',
                userId: user.username || ''
              });
              return {
                ...user,
                groups: (groupsResponse.data?.groups as unknown as any[])?.map(g => g?.name).filter(Boolean) || []
              } as User;
            } catch {
              return { ...user, groups: [] } as User;
            }
          })
        );
        
        setUsers(usersWithGroups.filter(Boolean) as User[]);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load groups
  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.mutations.authGroupMutation({
        operation: 'LIST_GROUPS',
        input: { limit: 60 }
      });
      
      if (response.data?.groups) {
        // For each group, get member count
        const groupsWithCounts = await Promise.all(
          (response.data.groups as unknown as any[]).map(async (group) => {
            if (!group) return null;
            try {
              const membersResponse = await client.mutations.authGroupMutation({
                operation: 'LIST_GROUP_MEMBERS',
                groupName: group.name || '',
                input: { limit: 1 }
              });
              return {
                ...group,
                memberCount: (membersResponse.data?.users as unknown as any[])?.length || 0
              } as Group;
            } catch {
              return { ...group, memberCount: 0 } as Group;
            }
          })
        );
        
        setGroups(groupsWithCounts.filter(Boolean) as Group[]);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on current tab
  React.useEffect(() => {
    if (currentTab === 'users') {
      loadUsers();
    } else {
      loadGroups();
    }
  }, [currentTab, loadUsers, loadGroups]);

  // Create user
  const handleCreateUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await client.queries.authUserQuery({
        operation: 'CREATE_USER',
        input: {
          email: userFormData.email,
          givenName: userFormData.givenName,
          familyName: userFormData.familyName,
          temporaryPassword: userFormData.temporaryPassword,
          suppressEmail: userFormData.suppressEmail
        }
      });
      
      setSuccess('User created successfully');
      setOpenUserDialog(false);
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await client.queries.authUserQuery({
        operation: 'UPDATE_USER',
        userId: selectedUser.username,
        input: {
          email: userFormData.email,
          givenName: userFormData.givenName,
          familyName: userFormData.familyName
        }
      });
      
      setSuccess('User updated successfully');
      setOpenUserDialog(false);
      loadUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (username: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await client.queries.authUserQuery({
        operation: 'DELETE_USER',
        userId: username
      });
      
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Enable/Disable user
  const handleToggleUserStatus = async (username: string, enable: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      await client.queries.authUserQuery({
        operation: enable ? 'ENABLE_USER' : 'DISABLE_USER',
        userId: username
      });
      
      setSuccess(`User ${enable ? 'enabled' : 'disabled'} successfully`);
      loadUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError(`Failed to ${enable ? 'enable' : 'disable'} user`);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (username: string) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await client.queries.authUserQuery({
        operation: 'RESET_PASSWORD',
        userId: username
      });
      
      setSuccess('Password reset email sent successfully');
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await client.mutations.authGroupMutation({
        operation: 'CREATE_GROUP',
        groupName: groupFormData.name,
        input: {
          description: groupFormData.description,
          precedence: groupFormData.precedence
        }
      });
      
      setSuccess('Group created successfully');
      setOpenGroupDialog(false);
      loadGroups();
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupName: string) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await client.mutations.authGroupMutation({
        operation: 'DELETE_GROUP',
        groupName
      });
      
      setSuccess('Group deleted successfully');
      loadGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  // Load group members
  const loadGroupMembers = async (groupName: string) => {
    setLoading(true);
    
    try {
      const response = await client.mutations.authGroupMutation({
        operation: 'LIST_GROUP_MEMBERS',
        groupName,
        input: { limit: 100 }
      });
      
      if (response.data?.users) {
        setGroupMembers((response.data.users as unknown as any[]).filter(Boolean) as User[]);
      }
    } catch (err) {
      console.error('Error loading group members:', err);
      setError('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  // Add user to group
  const handleAddUserToGroup = async (username: string, groupName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await client.mutations.authGroupMutation({
        operation: 'ADD_USER_TO_GROUP',
        groupName,
        userId: username
      });
      
      setSuccess('User added to group successfully');
      loadUsers();
    } catch (err) {
      console.error('Error adding user to group:', err);
      setError('Failed to add user to group');
    } finally {
      setLoading(false);
    }
  };

  // Remove user from group
  const handleRemoveUserFromGroup = async (username: string, groupName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await client.mutations.authGroupMutation({
        operation: 'REMOVE_USER_FROM_GROUP',
        groupName,
        userId: username
      });
      
      setSuccess('User removed from group successfully');
      loadUsers();
    } catch (err) {
      console.error('Error removing user from group:', err);
      setError('Failed to remove user from group');
    } finally {
      setLoading(false);
    }
  };

  // User columns for DataGrid
  const userColumns: GridColDef[] = [
    { field: 'username', headerName: 'Username', width: 250 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'givenName', headerName: 'First Name', width: 150 },
    { field: 'familyName', headerName: 'Last Name', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'CONFIRMED' ? 'success' : 'warning'}
        />
      )
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 100,
      renderCell: (params) => (
        <Switch
          checked={params.value}
          onChange={() => handleToggleUserStatus(params.row.username, !params.value)}
          size="small"
        />
      )
    },
    {
      field: 'groups',
      headerName: 'Groups',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value?.map((group: string) => (
            <Chip key={group} label={group} size="small" variant="outlined" />
          ))}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Manage Groups">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedUser(params.row);
                setUserGroups(params.row.groups || []);
                setAvailableGroups(groups.map(g => g.name).filter(name => !params.row.groups?.includes(name)));
                setOpenUserGroupDialog(true);
              }}
            >
              <GroupIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Password">
            <IconButton
              size="small"
              onClick={() => handleResetPassword(params.row.username)}
            >
              <LockResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteUser(params.row.username)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Group columns for DataGrid
  const groupColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'precedence', headerName: 'Precedence', width: 120 },
    {
      field: 'memberCount',
      headerName: 'Members',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 0} size="small" />
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : ''
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSelectedGroup(params.row);
              setGroupDialogMode('members');
              loadGroupMembers(params.row.name);
              setOpenGroupDialog(true);
            }}
          >
            View Members
          </Button>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteGroup(params.row.name)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          🔐 Auth Management
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Manage users and groups in your Amplify application
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
          <Tab label={`Users (${users.length})`} value="users" />
          <Tab label={`Groups (${groups.length})`} value="groups" />
        </Tabs>
      </Box>

      {/* Content */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {currentTab === 'users' ? 'Users' : 'Groups'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={currentTab === 'users' ? loadUsers : loadGroups} disabled={loading}>
                <RefreshIcon />
              </IconButton>
              {currentTab === 'users' ? (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setUserDialogMode('create');
                    setUserFormData({
                      email: '',
                      givenName: '',
                      familyName: '',
                      temporaryPassword: '',
                      suppressEmail: false
                    });
                    setOpenUserDialog(true);
                  }}
                >
                  Create User
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<GroupAddIcon />}
                  onClick={() => {
                    setGroupDialogMode('create');
                    setGroupFormData({
                      name: '',
                      description: '',
                      precedence: 0
                    });
                    setOpenGroupDialog(true);
                  }}
                >
                  Create Group
                </Button>
              )}
            </Box>
          </Box>

          {/* Data Grid */}
          <Box sx={{ height: 600, width: '100%' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={currentTab === 'users' ? users : groups}
                columns={currentTab === 'users' ? userColumns : groupColumns}
                getRowId={(row) => currentTab === 'users' ? row.username : row.name}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } }
                }}
                disableRowSelectionOnClick
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* User Create/Edit Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {userDialogMode === 'create' ? 'Create New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="First Name"
              value={userFormData.givenName}
              onChange={(e) => setUserFormData({ ...userFormData, givenName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={userFormData.familyName}
              onChange={(e) => setUserFormData({ ...userFormData, familyName: e.target.value })}
              fullWidth
            />
            {userDialogMode === 'create' && (
              <>
                <TextField
                  label="Temporary Password"
                  type="password"
                  value={userFormData.temporaryPassword}
                  onChange={(e) => setUserFormData({ ...userFormData, temporaryPassword: e.target.value })}
                  helperText="Leave empty to auto-generate"
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.suppressEmail}
                      onChange={(e) => setUserFormData({ ...userFormData, suppressEmail: e.target.checked })}
                    />
                  }
                  label="Suppress welcome email"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={userDialogMode === 'create' ? handleCreateUser : handleUpdateUser}
            variant="contained"
            disabled={loading || !userFormData.email}
          >
            {userDialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Create/Members Dialog */}
      <Dialog 
        open={openGroupDialog} 
        onClose={() => setOpenGroupDialog(false)} 
        maxWidth={groupDialogMode === 'members' ? 'md' : 'sm'} 
        fullWidth
      >
        <DialogTitle>
          {groupDialogMode === 'create' ? 'Create New Group' : 
           groupDialogMode === 'edit' ? 'Edit Group' : 
           `Members of ${selectedGroup?.name}`}
        </DialogTitle>
        <DialogContent>
          {groupDialogMode === 'create' || groupDialogMode === 'edit' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Group Name"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                required
                disabled={groupDialogMode === 'edit'}
                fullWidth
              />
              <TextField
                label="Description"
                value={groupFormData.description}
                onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="Precedence"
                type="number"
                value={groupFormData.precedence}
                onChange={(e) => setGroupFormData({ ...groupFormData, precedence: parseInt(e.target.value) || 0 })}
                helperText="Lower values have higher precedence"
                fullWidth
              />
            </Box>
          ) : (
            <List>
              {groupMembers.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No members in this group" />
                </ListItem>
              ) : (
                groupMembers.map((member) => (
                  <ListItem key={member.username}>
                    <ListItemText
                      primary={member.email}
                      secondary={`${member.givenName || ''} ${member.familyName || ''}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          handleRemoveUserFromGroup(member.username, selectedGroup?.name || '');
                          loadGroupMembers(selectedGroup?.name || '');
                        }}
                      >
                        <GroupRemoveIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupDialog(false)} disabled={loading}>
            Close
          </Button>
          {(groupDialogMode === 'create' || groupDialogMode === 'edit') && (
            <Button
              onClick={handleCreateGroup}
              variant="contained"
              disabled={loading || !groupFormData.name}
            >
              {groupDialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* User-Group Management Dialog */}
      <Dialog open={openUserGroupDialog} onClose={() => setOpenUserGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Manage Groups for {selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Groups</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {userGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No groups assigned</Typography>
              ) : (
                userGroups.map((group) => (
                  <Chip
                    key={group}
                    label={group}
                    onDelete={() => {
                      handleRemoveUserFromGroup(selectedUser?.username || '', group);
                      setUserGroups(userGroups.filter(g => g !== group));
                      setAvailableGroups([...availableGroups, group]);
                    }}
                  />
                ))
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Available Groups</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">All groups assigned</Typography>
              ) : (
                availableGroups.map((group) => (
                  <Chip
                    key={group}
                    label={group}
                    variant="outlined"
                    onClick={() => {
                      handleAddUserToGroup(selectedUser?.username || '', group);
                      setUserGroups([...userGroups, group]);
                      setAvailableGroups(availableGroups.filter(g => g !== group));
                    }}
                    icon={<GroupAddIcon />}
                  />
                ))
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserGroupDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}