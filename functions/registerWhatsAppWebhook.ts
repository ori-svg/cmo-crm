import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { company_id } = await req.json();

        if (!company_id) {
            return Response.json({ error: 'Missing company_id' }, { status: 400 });
        }

        console.log('🔗 Registering webhook for company:', company_id);

        // טען הגדרות WhatsApp
        const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: company_id
        });

        if (settings.length === 0) {
            return Response.json({ error: 'WhatsApp לא מחובר לחברה זו' }, { status: 400 });
        }

        const { business_account_id, access_token } = settings[0];

        // רשום webhook עם subscribed_fields=messages
        const webhookUrl = `https://graph.facebook.com/v24.0/${business_account_id}/subscribed_apps`;
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                access_token: access_token,
                subscribed_fields: 'messages'
            })
        });

        const result = await webhookResponse.json();
        console.log('📡 Webhook registration result:', JSON.stringify(result, null, 2));

        if (result.error) {
            console.error('❌ Webhook registration failed:', result.error);
            return Response.json({ 
                success: false, 
                error: result.error.message 
            });
        }

        console.log('✅ Webhook registered successfully!');

        return Response.json({ 
            success: true,
            waba_id: business_account_id,
            message: 'Webhook נרשם בהצלחה'
        });

    } catch (error) {
        console.error('❌ Error registering webhook:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});