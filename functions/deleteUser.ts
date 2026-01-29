import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (!user || user.email !== 'ori@omerdaffan.com') {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return Response.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }

    // Delete using service role
    await base44.asServiceRole.entities.User.delete(user_id);

    return Response.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});