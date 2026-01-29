import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        console.log('=== CREATE USER START ===');
        console.log('Current user:', user?.email);

        if (!user || user.email !== SUPER_ADMIN_EMAIL) {
            console.log('Unauthorized - user:', user?.email);
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const body = await req.json();
        console.log('Request body received:', JSON.stringify(body, null, 2));

        const { email, full_name, company_id, user_role } = body;

        if (!email || !full_name) {
            console.log('Missing required fields');
            return Response.json({ 
                success: false,
                error: 'Missing email or full_name' 
            }, { status: 400 });
        }

        // Check if user already exists
        console.log('Checking if user exists:', email);
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
        console.log('Existing users found:', existingUsers.length);
        
        if (existingUsers.length > 0) {
            console.log('User already exists');
            return Response.json({ 
                success: false,
                error: 'משתמש עם אימייל זה כבר קיים במערכת' 
            }, { status: 400 });
        }

        // Create user with ONLY custom fields from our User entity
        const userData = {};
        
        if (company_id) {
            userData.company_id = company_id;
        }
        if (user_role) {
            userData.user_role = user_role;
        }
        userData.status = 'פעיל';

        console.log('Creating user with custom fields:', JSON.stringify(userData, null, 2));
        
        // Create USER RECORD with custom fields
        // The email and full_name will be added when the user first logs in
        const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: full_name,
            ...userData
        });
        
        console.log('User created successfully:', newUser.id);
        console.log('=== CREATE USER SUCCESS ===');

        return Response.json({ 
            success: true,
            user: newUser,
            message: 'משתמש נוצר בהצלחה'
        });

    } catch (error) {
        console.error('=== CREATE USER ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return Response.json({ 
            success: false,
            error: error.message || 'Unknown error',
            errorName: error.name,
            details: error.stack
        }, { status: 500 });
    }
});