import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const META_APP_ID = '1509969996807376';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const REDIRECT_URI = 'https://cmo-crm.com/api/functions/whatsapp-oauth-callback';
const WEBHOOK_URL = 'https://cmo-crm.com/api/functions/whatsapp-webhook';
const WEBHOOK_VERIFY_TOKEN = 'cmo_crm_whatsapp_2024_secure_token';

Deno.serve(async (req) => {
    console.log('📞 exchange-whatsapp-code called');
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code, company_id } = await req.json();

        if (!code || !company_id) {
            return Response.json({ error: 'Missing code or company_id' }, { status: 400 });
        }

        console.log('📝 Got authorization code');
        console.log('🏢 Company ID:', company_id);

        // Step 1: Exchange code for access token (with redirect_uri for embedded signup)
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `client_id=${META_APP_ID}&` +
            `client_secret=${META_APP_SECRET}&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `code=${code}`;

        console.log('📡 Exchanging code for token...');
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('❌ Token exchange error:', tokenData.error);
            return Response.json({ 
                success: false, 
                error: tokenData.error.message 
            }, { status: 400 });
        }

        console.log('✅ Got access token');
        const accessToken = tokenData.access_token;

        // Step 2: Get user info
        const meUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`;
        const meResponse = await fetch(meUrl);
        const meData = await meResponse.json();

        console.log('👤 User:', meData);

        // Step 3: Get WhatsApp Business Accounts
        const wabaUrl = `https://graph.facebook.com/v19.0/${meData.id}/businesses?` +
            `fields=owned_whatsapp_business_accounts{id,name,message_templates,phone_numbers}&` +
            `access_token=${accessToken}`;
        
        const wabaResponse = await fetch(wabaUrl);
        const wabaData = await wabaResponse.json();

        console.log('📊 WABA Data:', JSON.stringify(wabaData, null, 2));

        let wabaId = "";
        let phoneNumberId = "";
        let displayPhoneNumber = "";

        // Extract WABA info
        if (wabaData.data && wabaData.data.length > 0) {
            const business = wabaData.data[0];
            if (business.owned_whatsapp_business_accounts && 
                business.owned_whatsapp_business_accounts.data.length > 0) {
                
                wabaId = business.owned_whatsapp_business_accounts.data[0].id;
                console.log('✅ Found WABA ID:', wabaId);

                // Get phone numbers
                const phoneUrl = `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
                const phoneResponse = await fetch(phoneUrl);
                const phoneData = await phoneResponse.json();

                console.log('📱 Phone Data:', JSON.stringify(phoneData, null, 2));

                if (phoneData.data && phoneData.data.length > 0) {
                    phoneNumberId = phoneData.data[0].id;
                    displayPhoneNumber = phoneData.data[0].display_phone_number || 
                                       phoneData.data[0].phone_number || "";
                    console.log('✅ Found Phone Number ID:', phoneNumberId);
                    console.log('📞 Display Phone Number:', displayPhoneNumber);
                }
            }
        }

        if (!wabaId || !phoneNumberId) {
            console.error('❌ Could not find WABA or Phone Number');
            return Response.json({ 
                success: false, 
                error: 'לא נמצא חשבון WhatsApp Business או מספר טלפון. אנא וודא שיש לך WhatsApp Business API setup.' 
            }, { status: 400 });
        }

        // Step 4: Register messages webhook subscription on WABA
        console.log('🔗 Registering messages webhook on WABA...');
        const webhookUrl = `https://graph.facebook.com/v24.0/${wabaId}/subscribed_apps`;
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                access_token: accessToken,
                subscribed_fields: 'messages'
            })
        });

        const webhookResult = await webhookResponse.json();
        console.log('📡 Webhook registration result:', JSON.stringify(webhookResult, null, 2));

        if (webhookResult.error) {
            console.error('❌ Failed to register webhook:', webhookResult.error);
            // Don't fail completely, just log the error
        } else {
            console.log('✅ Messages webhook registered successfully!');
        }

        // Step 6: Save to database
        const existingSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: company_id
        });
        
        const saveData = {
            business_account_id: wabaId,
            phone_number_id: phoneNumberId,
            access_token: accessToken,
            webhook_verify_token: WEBHOOK_VERIFY_TOKEN,
            webhook_url: WEBHOOK_URL,
            status: "מחובר",
            last_sync: new Date().toISOString(),
            error_message: null,
            company_id: company_id
        };

        if (existingSettings.length > 0) {
            await base44.asServiceRole.entities.WhatsAppSettings.update(
                existingSettings[0].id, 
                saveData
            );
            console.log('✅ Updated existing settings');
        } else {
            await base44.asServiceRole.entities.WhatsAppSettings.create(saveData);
            console.log('✅ Created new settings');
        }

        console.log('✅ WhatsApp connected successfully for company:', company_id);

        return Response.json({
            success: true,
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
            display_phone: displayPhoneNumber,
            webhook_registered: webhookResult.success || false
        });

    } catch (error) {
        console.error('❌ Error in exchange-whatsapp-code:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});