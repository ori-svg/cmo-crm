import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // בפרודקשן: שנה לדומיין הספציפי של הטופס
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // קרא את גוף הבקשה
        const body = await req.json();
        const { 
            company_id, 
            first_name, 
            last_name, 
            phone, 
            email, 
            source, 
            notes,
            fb_campaign,
            status,
            tags,
            proposals
        } = body;

        // ולידציה בסיסית
        const validationErrors = [];

        if (!company_id) {
            validationErrors.push({ field: 'company_id', message: 'חסר מזהה חברה' });
        }

        if (!first_name || first_name.trim().length === 0) {
            validationErrors.push({ field: 'first_name', message: 'חסר שם פרטי' });
        }

        if (!phone || phone.trim().length === 0) {
            validationErrors.push({ field: 'phone', message: 'חסר מספר טלפון' });
        }

        // ולידציה לאימייל אם הוזן
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                validationErrors.push({ field: 'email', message: 'אימייל לא תקין' });
            }
        }

        if (validationErrors.length > 0) {
            return Response.json(
                { 
                    success: false, 
                    error: 'Validation failed',
                    fields: validationErrors 
                },
                { status: 422, headers: corsHeaders }
            );
        }

        // בדוק שהחברה קיימת ופעילה
        const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
        
        if (companies.length === 0) {
            return Response.json(
                { success: false, error: 'Company not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const company = companies[0];

        if (company.status !== 'פעילה') {
            return Response.json(
                { success: false, error: 'Company is not active' },
                { status: 404, headers: corsHeaders }
            );
        }

        // בדוק כפילויות
        const existingLeads = await base44.asServiceRole.entities.Lead.filter({ 
            company_id: company_id 
        });

        const normalizePhone = (phone) => {
            if (!phone) return null;
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('972')) return cleaned;
            if (cleaned.startsWith('0')) return '972' + cleaned.substring(1);
            return '972' + cleaned;
        };

        const normalizedPhone = normalizePhone(phone);
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        const duplicate = existingLeads.find(lead => {
            if (normalizedEmail && lead.email && lead.email.toLowerCase() === normalizedEmail) {
                return true;
            }
            if (normalizedPhone && lead.phone) {
                const existingNormalized = normalizePhone(lead.phone);
                if (existingNormalized === normalizedPhone) {
                    return true;
                }
            }
            return false;
        });

        if (duplicate) {
            return Response.json(
                { 
                    success: false, 
                    error: 'Duplicate lead',
                    message: 'ליד זה כבר קיים במערכת'
                },
                { status: 409, headers: corsHeaders }
            );
        }

        // צור את הליד
        const leadData = {
            company_id: company_id,
            first_name: first_name.trim(),
            last_name: last_name ? last_name.trim() : '',
            phone: phone.trim(),
            email: email ? email.trim() : null,
            source: source || 'טופס חיצוני',
            status: status || 'חדש',
            fb_campaign: fb_campaign || null,
            form_responses: notes || '',
            notes: notes ? `טופס חיצוני:\n${notes}` : 'נוצר מטופס חיצוני',
            tags: tags || [],
            proposals: proposals || []
        };

        const newLead = await base44.asServiceRole.entities.Lead.create(leadData);

        // רשום לוג
        console.log('✅ Lead created from external form:', {
            lead_id: newLead.id,
            company_id: company_id,
            company_name: company.name,
            source: leadData.source,
            ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent')
        });

        return Response.json(
            {
                success: true,
                lead_id: newLead.id
            },
            { 
                status: 201,
                headers: corsHeaders
            }
        );

    } catch (error) {
        console.error('Error in public-lead-form-submit:', error);
        return Response.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
});