import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // בפרודקשן: שנה לדומיין הספציפי של הטופס
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Form-Key',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { 
            status: 204,
            headers: corsHeaders 
        });
    }

    try {
        // בדוק X-Form-Key
        const formKey = req.headers.get('X-Form-Key');
        const expectedKey = Deno.env.get('X_FORM_KEY');

        if (!formKey) {
            return Response.json(
                { success: false, error: 'Missing X-Form-Key header' },
                { status: 401, headers: corsHeaders }
            );
        }

        if (formKey !== expectedKey) {
            return Response.json(
                { success: false, error: 'Invalid X-Form-Key' },
                { status: 403, headers: corsHeaders }
            );
        }

        const base44 = createClientFromRequest(req);

        // שלוף רשימת חברות פעילות בלבד
        const allCompanies = await base44.asServiceRole.entities.Company.list();
        
        const activeCompanies = allCompanies
            .filter(company => company.status === 'פעילה')
            .map(company => ({
                id: company.id,
                name: company.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'he'));

        return Response.json(
            {
                success: true,
                companies: activeCompanies
            },
            { 
                status: 200,
                headers: corsHeaders
            }
        );

    } catch (error) {
        console.error('Error in public-lead-form-companies:', error);
        return Response.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
});