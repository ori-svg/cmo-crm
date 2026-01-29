import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { template_name, phone_number } = await req.json();

        console.log('🧪 Testing WhatsApp send');
        console.log('📱 Phone:', phone_number);
        console.log('📝 Template:', template_name);

        // Get WhatsApp settings
        const settings = await base44.entities.WhatsAppSettings.filter({ 
            created_by: user.email 
        });

        if (settings.length === 0) {
            return Response.json({ error: 'WhatsApp לא מחובר' }, { status: 400 });
        }

        const { phone_number_id, access_token } = settings[0];

        console.log('🔑 Phone Number ID:', phone_number_id);
        console.log('🔑 Access Token:', access_token.substring(0, 20) + '...');

        // Clean phone
        let cleanPhone = phone_number.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '972' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('972')) {
            cleanPhone = '972' + cleanPhone;
        }

        console.log('📞 Clean phone:', cleanPhone);

        // Try to send
        const messageBody = {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
                name: template_name,
                language: { code: 'he' }
            }
        };

        console.log('📨 Sending message...');
        console.log('📨 Body:', JSON.stringify(messageBody, null, 2));

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageBody)
            }
        );

        const result = await response.json();

        console.log('📡 Response status:', response.status);
        console.log('📡 Response:', JSON.stringify(result, null, 2));

        if (result.error) {
            return Response.json({
                success: false,
                error: result.error.message,
                error_code: result.error.code,
                details: result.error
            });
        }

        return Response.json({
            success: true,
            message_id: result.messages?.[0]?.id,
            status: result.messages?.[0]?.message_status,
            response: result
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});