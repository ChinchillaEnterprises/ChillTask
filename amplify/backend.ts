import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
// Template functions removed - not needed for ChillTask
// import { authUsers } from './functions/auth-users/resource.js';
// import { authGroups } from './functions/auth-groups/resource.js';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  // authUsers,
  // authGroups,
});
