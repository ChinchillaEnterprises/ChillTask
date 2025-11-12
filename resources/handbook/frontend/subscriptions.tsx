"use client";

import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { useEffect, useRef } from "react";

const client = generateClient<Schema>();

/**
 * 🎯 Amplify Gen 2 Subscription Examples
 * 
 * This file demonstrates real-time subscriptions in AWS Amplify Gen 2
 * for building collaborative, live-updating applications.
 * 
 * ⚠️ NOTE: Post and Profile examples require adding these models to your schema.
 * See amplify/examples/data/ for model definitions.
 * The Todo examples work with the default schema!
 */

// =============================================================================
// BASIC SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe to All Todo Creates
 * Fires whenever ANY user creates a todo
 */
export function subscribeToTodoCreates(
  onNewTodo: (todo: Schema["Todo"]["type"]) => void
) {
  const subscription = client.models.Todo.onCreate().subscribe({
    next: (data) => {
      console.log("New todo created:", data);
      onNewTodo(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  // Always return unsubscribe function
  return () => subscription.unsubscribe();
}

/**
 * Subscribe to Todo Updates
 * Fires whenever ANY todo is updated
 */
export function subscribeToTodoUpdates(
  onTodoUpdate: (todo: Schema["Todo"]["type"]) => void
) {
  const subscription = client.models.Todo.onUpdate().subscribe({
    next: (data) => {
      console.log("Todo updated:", data);
      onTodoUpdate(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}

/**
 * Subscribe to Todo Deletes
 * Fires whenever ANY todo is deleted
 */
export function subscribeToTodoDeletes(
  onTodoDelete: (todo: Schema["Todo"]["type"]) => void
) {
  const subscription = client.models.Todo.onDelete().subscribe({
    next: (data) => {
      console.log("Todo deleted:", data);
      onTodoDelete(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}

// =============================================================================
// FILTERED SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe to Specific Author's Posts
 * Only fires for posts created by a specific author
 */
export function subscribeToAuthorPosts(
  authorId: string,
  onNewPost: (post: Schema["Post"]["type"]) => void
) {
  const subscription = client.models.Post.onCreate({
    filter: {
      authorId: {
        eq: authorId,
      },
    },
  }).subscribe({
    next: (data) => {
      console.log(`New post by author ${authorId}:`, data);
      onNewPost(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}

/**
 * Subscribe to Published Posts Only
 * Filters for posts that are marked as published
 */
export function subscribeToPublishedPosts(
  onPublishedPost: (post: Schema["Post"]["type"]) => void
) {
  const subscription = client.models.Post.onCreate({
    filter: {
      published: {
        eq: true,
      },
    },
  }).subscribe({
    next: (data) => {
      console.log("New published post:", data);
      onPublishedPost(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}

/**
 * Subscribe to Profile Updates for Specific User
 * Useful for real-time profile synchronization
 */
export function subscribeToUserProfileUpdates(
  userId: string,
  onProfileUpdate: (profile: Schema["Profile"]["type"]) => void
) {
  const subscription = client.models.Profile.onUpdate({
    filter: {
      userId: {
        eq: userId,
      },
    },
  }).subscribe({
    next: (data) => {
      console.log(`Profile updated for user ${userId}:`, data);
      onProfileUpdate(data);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}

// =============================================================================
// REACT HOOK PATTERNS
// =============================================================================

/**
 * Custom Hook: useRealtimeTodos
 * Manages todo subscriptions with React lifecycle
 */
export function useRealtimeTodos(
  onTodosChange: (event: {
    type: 'created' | 'updated' | 'deleted';
    todo: Schema["Todo"]["type"];
  }) => void
) {
  const subscriptionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Set up all subscriptions
    subscriptionsRef.current = [
      subscribeToTodoCreates((todo) => 
        onTodosChange({ type: 'created', todo })
      ),
      subscribeToTodoUpdates((todo) => 
        onTodosChange({ type: 'updated', todo })
      ),
      subscribeToTodoDeletes((todo) => 
        onTodosChange({ type: 'deleted', todo })
      ),
    ];

    // Cleanup function
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, [onTodosChange]);
}

/**
 * Custom Hook: usePostFeed
 * Real-time post feed with multiple subscriptions
 */
export function usePostFeed(
  filterAuthorId?: string,
  onlyPublished: boolean = true
) {
  const subscriptionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const subs: Array<() => void> = [];

    // Subscribe to creates with filters
    const createFilter: any = {};
    if (filterAuthorId) {
      createFilter.authorId = { eq: filterAuthorId };
    }
    if (onlyPublished) {
      createFilter.published = { eq: true };
    }

    const createSub = client.models.Post.onCreate({
      filter: Object.keys(createFilter).length > 0 ? createFilter : undefined,
    }).subscribe({
      next: (post) => {
        console.log("New post in feed:", post);
        // Handle new post
      },
      error: (error) => {
        console.error("Feed subscription error:", error);
      },
    });

    subs.push(() => createSub.unsubscribe());

    // Subscribe to updates
    const updateSub = client.models.Post.onUpdate({
      filter: Object.keys(createFilter).length > 0 ? createFilter : undefined,
    }).subscribe({
      next: (post) => {
        console.log("Post updated in feed:", post);
        // Handle updated post
      },
      error: (error) => {
        console.error("Feed subscription error:", error);
      },
    });

    subs.push(() => updateSub.unsubscribe());

    subscriptionsRef.current = subs;

    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, [filterAuthorId, onlyPublished]);
}

// =============================================================================
// COLLABORATIVE FEATURES
// =============================================================================

/**
 * Live Collaboration: Document Editing
 * Multiple users editing the same document
 */
export function subscribeToDocumentChanges(
  documentId: string,
  currentUserId: string,
  callbacks: {
    onRemoteChange: (change: any) => void;
    onUserJoin: (userId: string) => void;
    onUserLeave: (userId: string) => void;
  }
) {
  const subscriptions: Array<() => void> = [];

  // Subscribe to document updates from other users
  const updateSub = client.models.Todo.onUpdate({
    filter: {
      and: [
        { id: { eq: documentId } },
        // In a real app, you'd filter out current user's changes
      ],
    },
  }).subscribe({
    next: (data) => {
      // In a real collaborative app, you'd check if this is from another user
      callbacks.onRemoteChange(data);
    },
    error: (error) => {
      console.error("Collaboration error:", error);
    },
  });

  subscriptions.push(() => updateSub.unsubscribe());

  // Return cleanup function
  return () => {
    subscriptions.forEach(unsub => unsub());
  };
}

/**
 * Live Activity Feed
 * Show real-time activity across the application
 */
export function subscribeToActivityFeed(
  callbacks: {
    onNewPost: (post: Schema["Post"]["type"]) => void;
    onNewProfile: (profile: Schema["Profile"]["type"]) => void;
    onPostUpdate: (post: Schema["Post"]["type"]) => void;
  }
) {
  const subscriptions: Array<() => void> = [];

  // New posts
  const postCreateSub = client.models.Post.onCreate({
    filter: { published: { eq: true } },
  }).subscribe({
    next: callbacks.onNewPost,
    error: (error) => console.error("Activity feed error:", error),
  });
  subscriptions.push(() => postCreateSub.unsubscribe());

  // New profiles
  const profileCreateSub = client.models.Profile.onCreate().subscribe({
    next: callbacks.onNewProfile,
    error: (error) => console.error("Activity feed error:", error),
  });
  subscriptions.push(() => profileCreateSub.unsubscribe());

  // Post updates
  const postUpdateSub = client.models.Post.onUpdate({
    filter: { published: { eq: true } },
  }).subscribe({
    next: callbacks.onPostUpdate,
    error: (error) => console.error("Activity feed error:", error),
  });
  subscriptions.push(() => postUpdateSub.unsubscribe());

  return () => {
    subscriptions.forEach(unsub => unsub());
  };
}

// =============================================================================
// ADVANCED PATTERNS
// =============================================================================

/**
 * Subscription with Reconnection Handling
 * Handles network disconnections gracefully
 */
export function createResilientSubscription<T>(
  subscribeFunction: () => { unsubscribe: () => void },
  onData: (data: T) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  let subscription: { unsubscribe: () => void } | null = null;
  let isConnected = true;
  let reconnectTimer: NodeJS.Timeout | null = null;

  const connect = () => {
    try {
      subscription = subscribeFunction();
      isConnected = true;
      onConnectionChange?.(true);
    } catch (error) {
      console.error("Subscription connection error:", error);
      isConnected = false;
      onConnectionChange?.(false);
      
      // Retry connection after delay
      reconnectTimer = setTimeout(connect, 5000);
    }
  };

  // Initial connection
  connect();

  // Return cleanup function
  return () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (subscription) {
      subscription.unsubscribe();
    }
  };
}

/**
 * Subscription Queue Pattern
 * Batches rapid updates for performance
 */
export function createBatchedSubscription<T>(
  subscribeFunction: () => { unsubscribe: () => void },
  onBatch: (items: T[]) => void,
  batchDelay: number = 100
) {
  let batch: T[] = [];
  let batchTimer: NodeJS.Timeout | null = null;

  const processBatch = () => {
    if (batch.length > 0) {
      onBatch([...batch]);
      batch = [];
    }
  };

  const subscription = subscribeFunction();

  // Wrap the subscription to batch updates
  const wrappedSubscription = {
    unsubscribe: () => {
      if (batchTimer) {
        clearTimeout(batchTimer);
        processBatch(); // Process any remaining items
      }
      subscription.unsubscribe();
    },
  };

  return wrappedSubscription;
}

/**
 * Subscription with Local Cache Sync
 * Keeps local state in sync with server
 */
export function createSyncedSubscription<T extends { id: string }>(
  model: any,
  localCache: Map<string, T>,
  onCacheUpdate: (cache: Map<string, T>) => void
) {
  const subscriptions: Array<() => void> = [];

  // Subscribe to creates
  const createSub = model.onCreate().subscribe({
    next: (item: T) => {
      localCache.set(item.id, item);
      onCacheUpdate(new Map(localCache));
    },
  });
  subscriptions.push(() => createSub.unsubscribe());

  // Subscribe to updates
  const updateSub = model.onUpdate().subscribe({
    next: (item: T) => {
      localCache.set(item.id, item);
      onCacheUpdate(new Map(localCache));
    },
  });
  subscriptions.push(() => updateSub.unsubscribe());

  // Subscribe to deletes
  const deleteSub = model.onDelete().subscribe({
    next: (item: T) => {
      localCache.delete(item.id);
      onCacheUpdate(new Map(localCache));
    },
  });
  subscriptions.push(() => deleteSub.unsubscribe());

  return () => {
    subscriptions.forEach(unsub => unsub());
  };
}

// =============================================================================
// ERROR HANDLING AND MONITORING
// =============================================================================

/**
 * Subscription with Error Recovery
 */
export function createMonitoredSubscription<T>(
  name: string,
  subscribeFunction: () => { unsubscribe: () => void },
  callbacks: {
    onData: (data: T) => void;
    onError?: (error: any) => void;
    onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
  }
) {
  let errorCount = 0;
  const maxErrors = 5;

  const handleError = (error: any) => {
    errorCount++;
    console.error(`Subscription ${name} error (${errorCount}/${maxErrors}):`, error);
    
    callbacks.onError?.(error);
    callbacks.onStatusChange?.('error');

    if (errorCount >= maxErrors) {
      console.error(`Subscription ${name} exceeded max errors, stopping`);
      callbacks.onStatusChange?.('disconnected');
      // In production, you might want to alert monitoring service
    }
  };

  try {
    const subscription = subscribeFunction();
    callbacks.onStatusChange?.('connected');
    
    return () => {
      subscription.unsubscribe();
      callbacks.onStatusChange?.('disconnected');
    };
  } catch (error) {
    handleError(error);
    return () => {}; // Return empty cleanup function
  }
}