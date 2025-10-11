import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * 🎯 Example: Blog Platform Schema
 * 
 * This example shows how to build a complete blog platform with:
 * - Posts with publishing workflow
 * - User profiles
 * - Custom business logic
 * - Different authorization patterns
 * 
 * To use this in your app:
 * 1. Copy the models you need to your amplify/data/resource.ts
 * 2. Copy any custom operations you want
 * 3. Adjust authorization rules for your needs
 * 4. Create the Lambda functions referenced in handlers
 */

const schema = a.schema({
  // ========================================================================
  // BLOG POST MODEL
  // ========================================================================
  Post: a
    .model({
      // Required fields
      title: a.string().required(),
      content: a.string().required(),
      authorId: a.string().required(),
      
      // Publishing workflow
      published: a.boolean().default(false),
      publishedAt: a.datetime(),
      
      // SEO and metadata
      slug: a.string(),
      excerpt: a.string(),
      featuredImage: a.string(),
      tags: a.string().array(),
      
      // Analytics
      viewCount: a.integer().default(0),
      likeCount: a.integer().default(0),
      
      // Timestamps (auto-managed by Amplify)
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      // Authors can do everything with their posts
      allow.owner().to(["create", "read", "update", "delete"]),
      
      // Other authenticated users can only read published posts
      allow.authenticated().to(["read"]).when((post) => post.published.eq(true)),
      
      // Public can read published posts (if you add API key auth)
      // allow.publicApiKey().to(["read"]).when((post) => post.published.eq(true)),
      
      // Admin group can manage all posts
      // allow.groups(["admin"]).to(["create", "read", "update", "delete"]),
    ])
    // Add indexes for common queries
    .secondaryIndexes((index) => [
      index("byAuthor").partitionKey("authorId").sortKey("createdAt"),
      index("byPublished").partitionKey("published").sortKey("publishedAt"),
    ]),

  // ========================================================================
  // USER PROFILE MODEL
  // ========================================================================
  Profile: a
    .model({
      // User identification
      userId: a.string().required(), // Links to Cognito user ID
      email: a.email().required(),
      
      // Profile information
      displayName: a.string(),
      bio: a.string(),
      avatar: a.string(),
      website: a.url(),
      location: a.string(),
      
      // Social links
      twitter: a.string(),
      github: a.string(),
      linkedin: a.string(),
      
      // User stats (could be computed)
      postCount: a.integer().default(0),
      followerCount: a.integer().default(0),
      followingCount: a.integer().default(0),
      
      // Account metadata
      joinedDate: a.datetime(),
      lastActiveDate: a.datetime(),
      isVerified: a.boolean().default(false),
      isPremium: a.boolean().default(false),
    })
    .authorization((allow) => [
      // Users can manage their own profile
      allow.owner().to(["create", "read", "update", "delete"]),
      
      // Other users can view profiles
      allow.authenticated().to(["read"]),
      
      // Public can view profiles (if API key enabled)
      // allow.publicApiKey().to(["read"]),
    ]),

  // ========================================================================
  // COMMENT MODEL (for blog posts)
  // ========================================================================
  Comment: a
    .model({
      postId: a.string().required(),
      authorId: a.string().required(),
      content: a.string().required(),
      
      // Nested comments support
      parentCommentId: a.string(), // null for top-level comments
      
      // Moderation
      isApproved: a.boolean().default(true),
      isDeleted: a.boolean().default(false),
      
      // Engagement
      likeCount: a.integer().default(0),
      
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      // Comment authors can manage their comments
      allow.owner().to(["create", "read", "update", "delete"]),
      
      // Others can read approved comments
      allow.authenticated().to(["read"]).when((comment) => comment.isApproved.eq(true)),
      
      // Anyone can create comments (authenticated)
      allow.authenticated().to(["create"]),
    ])
    .secondaryIndexes((index) => [
      index("byPost").partitionKey("postId").sortKey("createdAt"),
    ]),

  // ========================================================================
  // CUSTOM TYPES FOR COMPLEX OPERATIONS
  // ========================================================================
  
  // Statistics type for analytics
  BlogStats: a.customType({
    totalPosts: a.integer().required(),
    publishedPosts: a.integer().required(),
    totalViews: a.integer().required(),
    totalLikes: a.integer().required(),
    topTags: a.string().array(),
    lastPostDate: a.datetime(),
  }),

  // Author info with stats
  AuthorInfo: a.customType({
    profile: a.ref('Profile').required(),
    stats: a.ref('BlogStats').required(),
    recentPosts: a.ref('Post').array(),
  }),

  // Search result type
  SearchResult: a.customType({
    posts: a.ref('Post').array(),
    profiles: a.ref('Profile').array(),
    totalResults: a.integer().required(),
    searchTime: a.float(),
  }),

  // ========================================================================
  // CUSTOM QUERIES
  // ========================================================================
  
  /**
   * Get author information with stats and recent posts
   */
  getAuthorInfo: a
    .query()
    .arguments({
      authorId: a.string().required(),
      includeRecentPosts: a.boolean().default(true),
      recentPostLimit: a.integer().default(5),
    })
    .returns(a.ref('AuthorInfo'))
    .handler(a.handler.function("getAuthorInfoFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Search across posts and profiles
   */
  searchBlog: a
    .query()
    .arguments({
      searchTerm: a.string().required(),
      searchType: a.enum(['all', 'posts', 'profiles']),
      limit: a.integer().default(20),
      offset: a.integer().default(0),
    })
    .returns(a.ref('SearchResult'))
    .handler(a.handler.function("searchBlogFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Get trending posts based on views and likes
   */
  getTrendingPosts: a
    .query()
    .arguments({
      timeRange: a.enum(['day', 'week', 'month', 'all']),
      limit: a.integer().default(10),
    })
    .returns(a.ref('Post').array())
    .handler(a.handler.function("getTrendingPostsFunction"))
    .authorization((allow) => [allow.authenticated()]),

  // ========================================================================
  // CUSTOM MUTATIONS
  // ========================================================================
  
  /**
   * Publish a post (updates multiple fields atomically)
   */
  publishPost: a
    .mutation()
    .arguments({
      postId: a.string().required(),
      scheduledTime: a.datetime(), // Optional: schedule for future
    })
    .returns(a.ref('Post'))
    .handler(a.handler.function("publishPostFunction"))
    .authorization((allow) => [
      allow.authenticated(), // Function will verify ownership
    ]),

  /**
   * Like/unlike a post
   */
  togglePostLike: a
    .mutation()
    .arguments({
      postId: a.string().required(),
    })
    .returns(a.customType({
      post: a.ref('Post').required(),
      liked: a.boolean().required(),
    }))
    .handler(a.handler.function("togglePostLikeFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Follow/unfollow a user
   */
  toggleFollow: a
    .mutation()
    .arguments({
      targetUserId: a.string().required(),
    })
    .returns(a.customType({
      following: a.boolean().required(),
      targetProfile: a.ref('Profile').required(),
    }))
    .handler(a.handler.function("toggleFollowFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Import blog posts from external source
   */
  importPosts: a
    .mutation()
    .arguments({
      source: a.enum(['wordpress', 'medium', 'markdown']),
      sourceUrl: a.string().required(),
      importAsDraft: a.boolean().default(true),
    })
    .returns(a.customType({
      imported: a.integer().required(),
      failed: a.integer().required(),
      posts: a.ref('Post').array(),
      errors: a.string().array(),
    }))
    .handler(a.handler.function("importPostsFunction"))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // Enable API key for public access and webhooks
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/**
 * 📚 IMPLEMENTATION NOTES
 * 
 * 1. RELATIONSHIPS:
 *    - Posts are linked to Profiles via authorId
 *    - Comments are linked to Posts via postId
 *    - Consider using @belongsTo/@hasMany when Amplify adds support
 * 
 * 2. INDEXES:
 *    - byAuthor: Get all posts by a specific author
 *    - byPublished: Get all published posts (for public feed)
 *    - byPost: Get all comments for a post
 * 
 * 3. AUTHORIZATION PATTERNS:
 *    - Owner-based: Users can only modify their own content
 *    - Conditional: Published content is publicly readable
 *    - Group-based: Admin users have full access (commented out)
 * 
 * 4. CUSTOM OPERATIONS:
 *    - Queries handle complex reads (search, trending, stats)
 *    - Mutations handle complex writes (publish, like, follow)
 *    - All need corresponding Lambda functions
 * 
 * 5. PERFORMANCE TIPS:
 *    - Use indexes for common query patterns
 *    - Implement caching for expensive operations
 *    - Consider DynamoDB batch operations for bulk imports
 *    - Use AppSync subscriptions sparingly
 * 
 * 6. NEXT STEPS:
 *    - Create Lambda functions for each custom operation
 *    - Add data validation in Lambda functions
 *    - Implement search with OpenSearch or DynamoDB
 *    - Add CloudWatch metrics for monitoring
 *    - Set up DynamoDB streams for real-time features
 */