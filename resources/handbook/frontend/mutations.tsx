"use client";

import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

/**
 * 🎯 Amplify Gen 2 Mutation Examples
 * 
 * This file demonstrates all the ways to perform mutations (create, update, delete)
 * in AWS Amplify Gen 2 with proper TypeScript typing and error handling.
 * 
 * ⚠️ NOTE: Post and Profile examples require adding these models to your schema.
 * See amplify/examples/data/ for model definitions.
 * The Todo examples work with the default schema!
 */

// =============================================================================
// CREATE MUTATIONS
// =============================================================================

/**
 * Basic Create - Simple todo creation
 */
export async function createTodoExample() {
  try {
    const { data, errors } = await client.models.Todo.create({
      content: "Learn Amplify mutations",
    });
    
    if (errors) {
      console.error("Create failed:", errors);
      return null;
    }
    
    console.log("Created todo:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Create with All Fields - Post with complete data
 */
export async function createPostExample() {
  try {
    const { data, errors } = await client.models.Post.create({
      title: "Getting Started with Amplify Gen 2",
      content: "Amplify Gen 2 makes it easy to build fullstack apps...",
      authorId: "user123", // In real app, get from Auth.getCurrentUser()
      published: true,
      // createdAt and updatedAt are auto-managed
    });
    
    if (errors) {
      console.error("Create post failed:", errors);
      return null;
    }
    
    console.log("Created post:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Create Profile - With owner-based auth
 */
export async function createProfileExample(userId: string) {
  try {
    const { data, errors } = await client.models.Profile.create({
      userId,
      displayName: "John Developer",
      bio: "Full-stack developer passionate about AWS",
      avatar: "https://example.com/avatar.jpg",
      joinedDate: new Date().toISOString(),
    });
    
    if (errors) {
      console.error("Create profile failed:", errors);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Batch Create - Creating multiple items
 */
export async function batchCreateTodos() {
  const todoContents = [
    "Learn mutations",
    "Learn queries", 
    "Learn subscriptions",
    "Build awesome app"
  ];
  
  try {
    // Create all todos in parallel
    const createPromises = todoContents.map(content => 
      client.models.Todo.create({ content })
    );
    
    const results = await Promise.all(createPromises);
    
    // Check for any failures
    const successful = results.filter(r => !r.errors).map(r => r.data);
    const failed = results.filter(r => r.errors);
    
    console.log(`Created ${successful.length} todos`);
    if (failed.length > 0) {
      console.error(`Failed to create ${failed.length} todos`);
    }
    
    return successful;
  } catch (error) {
    console.error("Batch create error:", error);
    return [];
  }
}

// =============================================================================
// UPDATE MUTATIONS
// =============================================================================

/**
 * Basic Update - Update a single field
 */
export async function updateTodoExample(todoId: string) {
  try {
    const { data, errors } = await client.models.Todo.update({
      id: todoId,
      content: "Updated todo content",
    });
    
    if (errors) {
      console.error("Update failed:", errors);
      return null;
    }
    
    console.log("Updated todo:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Partial Update - Update only specific fields
 */
export async function updatePostPublishStatus(postId: string, published: boolean) {
  try {
    const { data, errors } = await client.models.Post.update({
      id: postId,
      published,
      // Only updates the 'published' field, leaves others unchanged
    });
    
    if (errors) {
      console.error("Update post failed:", errors);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Conditional Update - Update based on current state
 */
export async function togglePostPublished(postId: string) {
  try {
    // First, get the current post
    const { data: post } = await client.models.Post.get({ id: postId });
    
    if (!post) {
      console.error("Post not found");
      return null;
    }
    
    // Toggle the published state
    const { data, errors } = await client.models.Post.update({
      id: postId,
      published: !post.published,
    });
    
    if (errors) {
      console.error("Toggle failed:", errors);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Update with Validation - Check before updating
 */
export async function updateProfileWithValidation(
  profileId: string,
  updates: Partial<Schema["Profile"]["type"]>
) {
  try {
    // Validate display name length
    if (updates.displayName && updates.displayName.length > 50) {
      throw new Error("Display name must be 50 characters or less");
    }
    
    // Validate bio length
    if (updates.bio && updates.bio.length > 500) {
      throw new Error("Bio must be 500 characters or less");
    }
    
    // Validate avatar URL
    if (updates.avatar && !updates.avatar.startsWith("https://")) {
      throw new Error("Avatar must be a secure HTTPS URL");
    }
    
    const { data, errors } = await client.models.Profile.update({
      id: profileId,
      ...updates,
    });
    
    if (errors) {
      console.error("Update profile failed:", errors);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Validation or update error:", error);
    return null;
  }
}

// =============================================================================
// DELETE MUTATIONS
// =============================================================================

/**
 * Basic Delete - Delete by ID
 */
export async function deleteTodoExample(todoId: string) {
  try {
    const { data, errors } = await client.models.Todo.delete({
      id: todoId,
    });
    
    if (errors) {
      console.error("Delete failed:", errors);
      return false;
    }
    
    console.log("Deleted todo:", data);
    return true;
  } catch (error) {
    console.error("Unexpected error:", error);
    return false;
  }
}

/**
 * Delete with Confirmation - Ask user before deleting
 */
export async function deletePostWithConfirmation(postId: string, postTitle: string) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${postTitle}"? This action cannot be undone.`
  );
  
  if (!confirmed) {
    console.log("Delete cancelled by user");
    return false;
  }
  
  try {
    const { data, errors } = await client.models.Post.delete({
      id: postId,
    });
    
    if (errors) {
      console.error("Delete post failed:", errors);
      alert("Failed to delete post. Please try again.");
      return false;
    }
    
    console.log("Deleted post:", data);
    return true;
  } catch (error) {
    console.error("Unexpected error:", error);
    alert("An unexpected error occurred");
    return false;
  }
}

/**
 * Soft Delete Pattern - Mark as deleted instead of removing
 * Note: This requires adding a 'deleted' field to your model
 */
export async function softDeletePost(postId: string) {
  try {
    // Instead of deleting, we update a field
    const { data, errors } = await client.models.Post.update({
      id: postId,
      published: false, // Or add a 'deleted: true' field
      // deleted: true, // If you add this field to your schema
    });
    
    if (errors) {
      console.error("Soft delete failed:", errors);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Batch Delete - Delete multiple items
 */
export async function batchDeleteTodos(todoIds: string[]) {
  try {
    const deletePromises = todoIds.map(id => 
      client.models.Todo.delete({ id })
    );
    
    const results = await Promise.all(deletePromises);
    
    const successful = results.filter(r => !r.errors).length;
    const failed = results.filter(r => r.errors).length;
    
    console.log(`Deleted ${successful} todos, ${failed} failed`);
    
    return {
      successful,
      failed,
      total: todoIds.length,
    };
  } catch (error) {
    console.error("Batch delete error:", error);
    return {
      successful: 0,
      failed: todoIds.length,
      total: todoIds.length,
    };
  }
}

// =============================================================================
// CUSTOM MUTATIONS (if you add them to your schema)
// =============================================================================

/**
 * Example: Custom Mutation Call
 * Uncomment and use if you add processUserAction to your schema
 */
/*
export async function processUserActionExample(userId: string, action: string) {
  try {
    const { data, errors } = await client.mutations.processUserAction({
      userId,
      action,
      metadata: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: "web-app",
        version: "1.0.0",
      }),
    });
    
    if (errors) {
      console.error("Process action failed:", errors);
      return null;
    }
    
    if (data.success) {
      console.log("Action processed:", data.message);
    } else {
      console.warn("Action failed:", data.message);
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}
*/

// =============================================================================
// ERROR HANDLING PATTERNS
// =============================================================================

/**
 * Comprehensive Error Handling Example
 */
export async function createWithErrorHandling(content: string) {
  try {
    const { data, errors } = await client.models.Todo.create({ content });
    
    if (errors) {
      // Handle specific error types
      errors.forEach(error => {
        if (error.message.includes("unauthorized")) {
          console.error("Auth error: User not authorized");
          // Redirect to login or show auth prompt
        } else if (error.message.includes("validation")) {
          console.error("Validation error:", error.message);
          // Show validation message to user
        } else if (error.message.includes("conflict")) {
          console.error("Conflict error: Item already exists");
          // Handle duplicate entry
        } else {
          console.error("Unknown error:", error);
          // Generic error handling
        }
      });
      return null;
    }
    
    return data;
  } catch (error) {
    // Network or unexpected errors
    if (error instanceof Error) {
      if (error.message.includes("Network")) {
        console.error("Network error: Check your connection");
      } else {
        console.error("Unexpected error:", error.message);
      }
    }
    return null;
  }
}

// =============================================================================
// OPTIMISTIC UPDATES
// =============================================================================

/**
 * Optimistic Update Pattern - Update UI before server confirms
 */
export async function createTodoOptimistic(
  content: string,
  onOptimisticUpdate: (tempTodo: any) => void,
  onSuccess: (realTodo: any) => void,
  onError: () => void
) {
  // Create temporary todo for immediate UI update
  const tempTodo = {
    id: `temp-${Date.now()}`,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Update UI optimistically
  onOptimisticUpdate(tempTodo);
  
  try {
    const { data, errors } = await client.models.Todo.create({ content });
    
    if (errors) {
      console.error("Create failed:", errors);
      onError(); // Revert optimistic update
      return null;
    }
    
    // Replace temp todo with real one
    onSuccess(data);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    onError(); // Revert optimistic update
    return null;
  }
}