import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ADMIN_EMAIL = "ori@omerdaffan.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.email !== ADMIN_EMAIL) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all users using service role
        const allUsers = await base44.asServiceRole.entities.User.list();
        
        return Response.json({ 
            success: true,
            users: allUsers
        });

    } catch (error) {
        console.error('Error listing users:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});