import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ADMIN_EMAIL = "ori@omerdaffan.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.email !== ADMIN_EMAIL) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, password, full_name } = await req.json();

        if (!email || !password || !full_name) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Create user using service role
        const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: full_name,
            role: 'user'
        });

        // Note: Password setting would typically happen through your auth provider
        // For now, we're just creating the user record
        
        return Response.json({ 
            success: true,
            user: newUser
        });

    } catch (error) {
        console.error('Error creating user:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});