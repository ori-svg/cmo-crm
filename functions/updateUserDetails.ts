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

    const { user_id, company_id, user_role, status, allowed_pages } = await req.json();

    if (!user_id) {
      return Response.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData = {};
    if (company_id !== undefined) updateData.company_id = company_id;
    if (user_role !== undefined) updateData.user_role = user_role;
    if (status !== undefined) updateData.status = status;
    if (allowed_pages !== undefined) updateData.allowed_pages = allowed_pages;

    // Update user
    await base44.asServiceRole.entities.User.update(user_id, updateData);

    return Response.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});