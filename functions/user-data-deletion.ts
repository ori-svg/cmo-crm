import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            console.log('User data deletion request:', body);
            
            // Meta sends: { "user_id": "...", "signed_request": "..." }
            const userId = body.user_id;
            
            // Log the deletion request
            // In a real app, you would delete all user data here
            
            return new Response(JSON.stringify({
                url: `https://cmo-crm.com/deletion?id=${userId}`,
                confirmation_code: `DEL_${userId}_${Date.now()}`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    if (req.method === 'GET') {
        return new Response('User Data Deletion Endpoint', { status: 200 });
    }
    
    return new Response('Method not allowed', { status: 405 });
});