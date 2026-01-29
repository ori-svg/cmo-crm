import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];
    const user = await base44.auth.me();
    if (!user || !SUPER_ADMIN_EMAILS.includes(user.email)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get all companies using service role
    const companies = await base44.asServiceRole.entities.Company.list();

    return Response.json({
      success: true,
      companies: companies
    });

  } catch (error) {
    console.error('Error listing companies:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});