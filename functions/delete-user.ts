import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ADMIN_EMAIL = "ori@omerdaffan.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.email !== ADMIN_EMAIL) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id } = await req.json();

        if (!user_id) {
            return Response.json({ error: 'Missing user_id' }, { status: 400 });
        }

        // Delete user using service role
        await base44.asServiceRole.entities.User.delete(user_id);
        
        return Response.json({ 
            success: true
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});