import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * 🛍️ Example: E-commerce Platform Schema
 * 
 * This example demonstrates a complete e-commerce data model with:
 * - Products with variants and inventory
 * - Shopping cart and orders
 * - Customer profiles and addresses
 * - Reviews and ratings
 * - Complex business logic
 * 
 * Key patterns shown:
 * - Inventory management
 * - Order workflow states
 * - Price calculations
 * - Multi-currency support
 */

const schema = a.schema({
  // ========================================================================
  // PRODUCT CATALOG
  // ========================================================================
  Product: a
    .model({
      // Basic info
      name: a.string().required(),
      description: a.string().required(),
      category: a.string().required(),
      brand: a.string(),
      
      // Pricing
      basePrice: a.float().required(),
      currency: a.string().default("USD"),
      salePrice: a.float(), // null if not on sale
      
      // Media
      images: a.string().array().required(),
      thumbnail: a.string().required(),
      videos: a.string().array(),
      
      // Inventory
      sku: a.string().required(),
      stockQuantity: a.integer().default(0),
      lowStockThreshold: a.integer().default(10),
      
      // Product details
      weight: a.float(), // in kg
      dimensions: a.json(), // { length, width, height }
      tags: a.string().array(),
      
      // Status
      isActive: a.boolean().default(true),
      isFeatured: a.boolean().default(false),
      
      // SEO
      slug: a.string().required(),
      metaTitle: a.string(),
      metaDescription: a.string(),
      
      // Analytics
      viewCount: a.integer().default(0),
      purchaseCount: a.integer().default(0),
      averageRating: a.float().default(0),
      reviewCount: a.integer().default(0),
    })
    .authorization((allow) => [
      // Public can view active products
      allow.publicApiKey().to(["read"]).when((product) => product.isActive.eq(true)),
      allow.authenticated().to(["read"]),
      
      // Only admins can manage products
      allow.groups(["admin"]).to(["create", "read", "update", "delete"]),
    ])
    .secondaryIndexes((index) => [
      index("byCategory").partitionKey("category").sortKey("name"),
      index("bySKU").partitionKey("sku"),
    ]),

  // Product variants (size, color, etc.)
  ProductVariant: a
    .model({
      productId: a.string().required(),
      
      // Variant details
      name: a.string().required(), // e.g., "Large Blue"
      sku: a.string().required(),
      
      // Variant attributes
      size: a.string(),
      color: a.string(),
      material: a.string(),
      attributes: a.json(), // flexible for any attributes
      
      // Pricing override (if different from base)
      price: a.float(),
      
      // Inventory
      stockQuantity: a.integer().default(0),
      
      // Media
      image: a.string(),
      
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.groups(["admin"]).to(["create", "read", "update", "delete"]),
    ])
    .secondaryIndexes((index) => [
      index("byProduct").partitionKey("productId"),
      index("bySKU").partitionKey("sku"),
    ]),

  // ========================================================================
  // SHOPPING CART
  // ========================================================================
  Cart: a
    .model({
      userId: a.string().required(),
      
      // Cart metadata
      sessionId: a.string(), // for anonymous carts
      expiresAt: a.datetime(),
      
      // Totals (calculated)
      subtotal: a.float().default(0),
      tax: a.float().default(0),
      shipping: a.float().default(0),
      discount: a.float().default(0),
      total: a.float().default(0),
      
      // Applied codes
      couponCode: a.string(),
      
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.guest(), // For anonymous shopping
    ]),

  CartItem: a
    .model({
      cartId: a.string().required(),
      productId: a.string().required(),
      variantId: a.string(),
      
      // Item details (snapshot at time of adding)
      name: a.string().required(),
      price: a.float().required(),
      image: a.string(),
      
      // Quantity and totals
      quantity: a.integer().required(),
      subtotal: a.float().required(),
      
      // Custom options
      customization: a.json(), // e.g., engraving text
      giftWrap: a.boolean().default(false),
      giftMessage: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.guest(),
    ])
    .secondaryIndexes((index) => [
      index("byCart").partitionKey("cartId"),
    ]),

  // ========================================================================
  // ORDERS
  // ========================================================================
  Order: a
    .model({
      userId: a.string().required(),
      orderNumber: a.string().required(),
      
      // Order status workflow
      status: a.enum([
        'pending',
        'processing',
        'paid',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ]).required(),
      
      // Customer info (snapshot)
      customerEmail: a.email().required(),
      customerName: a.string().required(),
      customerPhone: a.phone(),
      
      // Addresses
      shippingAddress: a.json().required(),
      billingAddress: a.json().required(),
      
      // Pricing
      subtotal: a.float().required(),
      tax: a.float().required(),
      shipping: a.float().required(),
      discount: a.float().default(0),
      total: a.float().required(),
      currency: a.string().default("USD"),
      
      // Payment
      paymentMethod: a.string().required(),
      paymentStatus: a.enum(['pending', 'paid', 'failed', 'refunded']),
      stripePaymentIntent: a.string(),
      
      // Shipping
      shippingMethod: a.string(),
      shippingCarrier: a.string(),
      trackingNumber: a.string(),
      estimatedDelivery: a.date(),
      
      // Metadata
      notes: a.string(),
      couponCode: a.string(),
      referralSource: a.string(),
      
      // Dates
      orderedAt: a.datetime().required(),
      paidAt: a.datetime(),
      shippedAt: a.datetime(),
      deliveredAt: a.datetime(),
      cancelledAt: a.datetime(),
    })
    .authorization((allow) => [
      // Customers can view their own orders
      allow.owner().to(["read"]),
      
      // Admins can manage all orders
      allow.groups(["admin"]).to(["create", "read", "update", "delete"]),
      
      // Warehouse staff can update shipping info
      allow.groups(["warehouse"]).to(["read", "update"]),
    ])
    .secondaryIndexes((index) => [
      index("byUser").partitionKey("userId").sortKey("orderedAt"),
      index("byStatus").partitionKey("status").sortKey("orderedAt"),
      index("byOrderNumber").partitionKey("orderNumber"),
    ]),

  OrderItem: a
    .model({
      orderId: a.string().required(),
      productId: a.string().required(),
      variantId: a.string(),
      
      // Product snapshot
      name: a.string().required(),
      sku: a.string().required(),
      price: a.float().required(),
      image: a.string(),
      
      // Quantity and totals
      quantity: a.integer().required(),
      subtotal: a.float().required(),
      
      // Fulfillment
      fulfillmentStatus: a.enum(['pending', 'packed', 'shipped', 'delivered']),
      
      // Custom options
      customization: a.json(),
      giftWrap: a.boolean().default(false),
      giftMessage: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read"]),
      allow.groups(["admin", "warehouse"]).to(["read", "update"]),
    ])
    .secondaryIndexes((index) => [
      index("byOrder").partitionKey("orderId"),
    ]),

  // ========================================================================
  // CUSTOMER DATA
  // ========================================================================
  Customer: a
    .model({
      userId: a.string().required(),
      email: a.email().required(),
      
      // Profile
      firstName: a.string(),
      lastName: a.string(),
      phone: a.phone(),
      dateOfBirth: a.date(),
      
      // Preferences
      newsletterSubscribed: a.boolean().default(true),
      smsNotifications: a.boolean().default(false),
      preferredCurrency: a.string().default("USD"),
      preferredLanguage: a.string().default("en"),
      
      // Loyalty program
      loyaltyPoints: a.integer().default(0),
      loyaltyTier: a.enum(['bronze', 'silver', 'gold', 'platinum']),
      
      // Analytics
      totalOrders: a.integer().default(0),
      totalSpent: a.float().default(0),
      averageOrderValue: a.float().default(0),
      lastOrderDate: a.datetime(),
      
      // Account status
      isActive: a.boolean().default(true),
      isVIP: a.boolean().default(false),
      
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "update"]),
      allow.groups(["admin", "support"]).to(["read", "update"]),
    ]),

  Address: a
    .model({
      customerId: a.string().required(),
      
      // Address details
      label: a.string(), // e.g., "Home", "Work"
      firstName: a.string().required(),
      lastName: a.string().required(),
      company: a.string(),
      street1: a.string().required(),
      street2: a.string(),
      city: a.string().required(),
      state: a.string().required(),
      postalCode: a.string().required(),
      country: a.string().required(),
      phone: a.phone(),
      
      // Flags
      isDefault: a.boolean().default(false),
      isBilling: a.boolean().default(true),
      isShipping: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
    ])
    .secondaryIndexes((index) => [
      index("byCustomer").partitionKey("customerId"),
    ]),

  // ========================================================================
  // REVIEWS & RATINGS
  // ========================================================================
  Review: a
    .model({
      productId: a.string().required(),
      customerId: a.string().required(),
      orderId: a.string(), // Verified purchase
      
      // Review content
      rating: a.integer().required(), // 1-5 stars
      title: a.string(),
      comment: a.string().required(),
      images: a.string().array(),
      
      // Helpful votes
      helpfulCount: a.integer().default(0),
      notHelpfulCount: a.integer().default(0),
      
      // Status
      isVerifiedPurchase: a.boolean().default(false),
      isApproved: a.boolean().default(false),
      
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.publicApiKey().to(["read"]).when((review) => review.isApproved.eq(true)),
      allow.groups(["admin"]).to(["read", "update", "delete"]),
    ])
    .secondaryIndexes((index) => [
      index("byProduct").partitionKey("productId").sortKey("createdAt"),
      index("byCustomer").partitionKey("customerId").sortKey("createdAt"),
    ]),

  // ========================================================================
  // CUSTOM TYPES
  // ========================================================================
  PriceCalculation: a.customType({
    subtotal: a.float().required(),
    tax: a.float().required(),
    shipping: a.float().required(),
    discount: a.float().required(),
    total: a.float().required(),
    appliedCoupons: a.string().array(),
  }),

  InventoryStatus: a.customType({
    inStock: a.boolean().required(),
    quantity: a.integer().required(),
    reservedQuantity: a.integer().required(),
    availableQuantity: a.integer().required(),
    nextRestockDate: a.date(),
  }),

  OrderSummary: a.customType({
    orderId: a.string().required(),
    orderNumber: a.string().required(),
    status: a.string().required(),
    total: a.float().required(),
    itemCount: a.integer().required(),
    trackingUrl: a.string(),
  }),

  // ========================================================================
  // CUSTOM QUERIES
  // ========================================================================
  
  /**
   * Get product with real-time inventory
   */
  getProductWithInventory: a
    .query()
    .arguments({
      productId: a.string().required(),
      includeVariants: a.boolean().default(true),
    })
    .returns(a.customType({
      product: a.ref('Product').required(),
      variants: a.ref('ProductVariant').array(),
      inventory: a.ref('InventoryStatus').required(),
    }))
    .handler(a.handler.function("getProductWithInventoryFunction"))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  /**
   * Calculate cart totals with tax and shipping
   */
  calculateCartTotals: a
    .query()
    .arguments({
      cartId: a.string().required(),
      shippingAddress: a.json().required(),
      couponCode: a.string(),
    })
    .returns(a.ref('PriceCalculation'))
    .handler(a.handler.function("calculateCartTotalsFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Get personalized product recommendations
   */
  getRecommendations: a
    .query()
    .arguments({
      customerId: a.string(),
      productId: a.string(),
      type: a.enum(['similar', 'frequently_bought', 'trending', 'personalized']),
      limit: a.integer().default(10),
    })
    .returns(a.ref('Product').array())
    .handler(a.handler.function("getRecommendationsFunction"))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  // ========================================================================
  // CUSTOM MUTATIONS
  // ========================================================================
  
  /**
   * Add item to cart with inventory check
   */
  addToCart: a
    .mutation()
    .arguments({
      productId: a.string().required(),
      variantId: a.string(),
      quantity: a.integer().required(),
      customization: a.json(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      cartItem: a.ref('CartItem'),
      cart: a.ref('Cart'),
      error: a.string(),
    }))
    .handler(a.handler.function("addToCartFunction"))
    .authorization((allow) => [allow.authenticated(), allow.guest()]),

  /**
   * Checkout and create order
   */
  checkout: a
    .mutation()
    .arguments({
      cartId: a.string().required(),
      shippingAddress: a.json().required(),
      billingAddress: a.json().required(),
      paymentMethodId: a.string().required(), // Stripe payment method
      saveAddress: a.boolean().default(false),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      order: a.ref('Order'),
      paymentIntent: a.string(),
      error: a.string(),
    }))
    .handler(a.handler.function("checkoutFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Process return/refund
   */
  processReturn: a
    .mutation()
    .arguments({
      orderId: a.string().required(),
      items: a.json().required(), // Array of { orderItemId, quantity, reason }
      refundAmount: a.float(),
      notes: a.string(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      returnId: a.string(),
      refundId: a.string(),
      error: a.string(),
    }))
    .handler(a.handler.function("processReturnFunction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Update inventory (admin only)
   */
  updateInventory: a
    .mutation()
    .arguments({
      updates: a.json().required(), // Array of { productId, variantId?, quantity, operation: 'set' | 'add' | 'subtract' }
    })
    .returns(a.customType({
      success: a.boolean().required(),
      updated: a.integer().required(),
      errors: a.string().array(),
    }))
    .handler(a.handler.function("updateInventoryFunction"))
    .authorization((allow) => [allow.groups(["admin", "warehouse"])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/**
 * 💡 E-COMMERCE IMPLEMENTATION TIPS
 * 
 * 1. INVENTORY MANAGEMENT:
 *    - Use DynamoDB transactions for atomic inventory updates
 *    - Implement reservation system for cart items
 *    - Set up CloudWatch alarms for low stock
 *    - Consider eventual consistency for high-traffic items
 * 
 * 2. PAYMENT PROCESSING:
 *    - Always use Stripe Payment Intents for SCA compliance
 *    - Store minimal payment data (never store card numbers)
 *    - Implement webhook handlers for payment events
 *    - Use idempotency keys for payment operations
 * 
 * 3. ORDER WORKFLOW:
 *    - Use Step Functions for complex order processing
 *    - Implement saga pattern for distributed transactions
 *    - Set up DynamoDB streams for order events
 *    - Send notifications via SNS/SES
 * 
 * 4. PERFORMANCE OPTIMIZATION:
 *    - Cache product catalog in CloudFront
 *    - Use ElastiCache for session/cart data
 *    - Implement read replicas for analytics queries
 *    - Batch operations where possible
 * 
 * 5. SEARCH & DISCOVERY:
 *    - Integrate OpenSearch for product search
 *    - Use Personalize for recommendations
 *    - Implement faceted search with aggregations
 *    - Cache popular searches
 * 
 * 6. SECURITY CONSIDERATIONS:
 *    - PCI compliance for payment data
 *    - Rate limiting on checkout endpoints
 *    - Fraud detection integration
 *    - Regular security audits
 */