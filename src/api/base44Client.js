import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68e269cf49dbea22db33606b", 
  requiresAuth: true // Ensure authentication is required for all operations
});
