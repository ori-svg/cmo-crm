import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // No authentication required - can be called from automations
        const { phone, message_text, company_id, lead_id } = await req.json();

        if (!phone || !message_text) {
            return Response.json({ 
                error: 'Missing required fields: phone and message_text' 
            }, { status: 400 });
        }

        console.log('📱 Sending free-form WhatsApp message:', {
            phone,
            message_text: message_text.substring(0, 50) + '...',
            company_id,
            lead_id
        });

        // נרמול מספר טלפון
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.substring(1)}`;

        // טען הגדרות WhatsApp
        let waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: company_id
        });

        // אם אין הגדרות - בדוק חברת אם
        if (waSettings.length === 0 && company_id) {
            const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
            if (companies.length > 0 && companies[0].parent_company_id) {
                waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                    company_id: companies[0].parent_company_id
                });
            }
        }

        if (waSettings.length === 0 || !waSettings[0].access_token) {
            return Response.json({ 
                success: false,
                error: 'WhatsApp not configured for this company' 
            }, { status: 400 });
        }

        const settings = waSettings[0];

        // שלח הודעת טקסט חופשית
        const messageBody = {
            messaging_product: 'whatsapp',
            to: phoneWithCountry,
            type: 'text',
            text: {
                body: message_text
            }
        };

        const waResponse = await fetch(
            `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageBody)
            }
        );

        const waData = await waResponse.json();

        if (waResponse.ok && waData.messages?.[0]?.id) {
            console.log('✅ Message sent:', waData.messages[0].id);

            // שמור הודעה במסד נתונים
            await base44.asServiceRole.entities.WhatsAppMessage.create({
                message_id: waData.messages[0].id,
                company_id: company_id,
                lead_id: lead_id || null,
                phone_number: phoneWithCountry,
                phone_number_id: settings.phone_number_id,
                direction: 'יוצא',
                type: 'text',
                content: message_text,
                status: 'נשלח',
                timestamp: new Date().toISOString(),
                read: false
            });

            return Response.json({
                success: true,
                message_id: waData.messages[0].id
            });
        } else {
            console.error('❌ Failed to send message:', waData);
            return Response.json({
                success: false,
                error: waData.error?.message || 'Unknown error'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});