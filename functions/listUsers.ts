import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const currentUser = await base44.auth.me();
    if (!currentUser || !["ori@omerdaffan.com", "cmo@omerdaffan.com"].includes(currentUser.email)) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list('-created_date');
    
    console.log('📊 Total users found:', users.length);

    return Response.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});