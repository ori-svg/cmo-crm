import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { companyId } = await req.json();

        if (!companyId) {
            return Response.json({ 
                success: false,
                error: 'Missing companyId' 
            }, { status: 400 });
        }

        console.log('📞 Subscribing WhatsApp webhook for company:', companyId);

        // טען הגדרות WhatsApp
        const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: companyId
        });

        if (settings.length === 0) {
            return Response.json({ 
                success: false,
                error: 'WhatsApp לא מחובר לחברה זו' 
            }, { status: 400 });
        }

        const { business_account_id, access_token, phone_number_id } = settings[0];

        if (!business_account_id || !access_token) {
            return Response.json({ 
                success: false,
                error: 'חסרים פרטי חיבור ל-WhatsApp' 
            }, { status: 400 });
        }

        // 🔔 רישום webhook ל-WABA
        console.log('📡 Registering webhook for WABA:', business_account_id);
        
        const webhookUrl = `https://graph.facebook.com/v21.0/${business_account_id}/subscribed_apps`;
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subscribed_fields: ['messages']
            })
        });

        const webhookResult = await webhookResponse.json();
        
        if (!webhookResponse.ok) {
            console.error('❌ Webhook registration failed:', webhookResult);
            return Response.json({ 
                success: false,
                error: webhookResult.error?.message || 'Failed to register webhook',
                details: webhookResult
            });
        }

        console.log('✅ Webhook registered successfully:', webhookResult);

        // ✅ עדכן את הגדרות WhatsApp עם סטטוס webhook
        await base44.asServiceRole.entities.WhatsAppSettings.update(settings[0].id, {
            last_sync: new Date().toISOString()
        });

        return Response.json({ 
            success: true,
            waba_id: business_account_id,
            phone_number_id: phone_number_id,
            message: 'Webhook נרשם בהצלחה'
        });

    } catch (error) {
        console.error('❌ Error subscribing webhook:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});