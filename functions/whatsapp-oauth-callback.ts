import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const META_APP_ID = '1509969996807376';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const REDIRECT_URI = 'https://cmo-crm.com/api/functions/whatsapp-oauth-callback';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    
    console.log('📱 WhatsApp OAuth callback called');
    console.log('Query params:', Object.fromEntries(url.searchParams));

    try {
        const base44 = createClientFromRequest(req);

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const state = url.searchParams.get('state'); // company_id

        // Handle errors
        if (error) {
            console.error('OAuth Error:', error, errorDescription);
            return new Response(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>שגיאה</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            text-align: center; 
                            padding: 50px; 
                            background: linear-gradient(135deg, #fee 0%, #fcc 100%);
                            margin: 0;
                        }
                        .error { 
                            background: white; 
                            padding: 40px; 
                            border-radius: 16px; 
                            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                            max-width: 500px; 
                            margin: 0 auto;
                        }
                        h1 { color: #c00; margin-bottom: 20px; font-size: 28px; }
                        p { color: #666; margin: 15px 0; line-height: 1.6; }
                        .icon { font-size: 64px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <div class="icon">❌</div>
                        <h1>שגיאה בחיבור WhatsApp</h1>
                        <p><strong>סיבה:</strong> ${errorDescription || error}</p>
                        <p style="font-size: 14px; color: #999;">החלון ייסגר אוטומטית בעוד 5 שניות...</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ 
                                event: "whatsapp_error",
                                error: "${errorDescription || error}".replace(/\\n/g, ' ')
                            }, "*");
                        }
                        setTimeout(() => window.close(), 5000);
                    </script>
                </body>
                </html>
            `, {
                status: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        if (code) {
            console.log('📝 Got authorization code, exchanging...');
            console.log('🏢 Company ID from state:', state);
            
            const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
                `client_id=${META_APP_ID}&` +
                `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
                `client_secret=${META_APP_SECRET}&` +
                `code=${code}`;

            const tokenResponse = await fetch(tokenUrl);
            const tokenData = await tokenResponse.json();

            if (tokenData.error) {
                console.error('Token exchange error:', tokenData.error);
                throw new Error(tokenData.error.message || JSON.stringify(tokenData.error));
            }

            console.log('✅ Got access token');
            const accessToken = tokenData.access_token;

            // Get WhatsApp Business Account info
            console.log('🔍 Fetching WhatsApp Business Accounts...');
            
            const wabaUrl = `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${accessToken}`;
            const wabaResponse = await fetch(wabaUrl);
            const wabaData = await wabaResponse.json();

            console.log('📱 WABA Data:', JSON.stringify(wabaData, null, 2));

            let businessAccountId = "";
            let phoneNumberId = "";
            let phoneNumber = "";

            // Try to extract WhatsApp Business Account info
            if (wabaData.data && wabaData.data.length > 0) {
                for (const business of wabaData.data) {
                    if (business.owned_whatsapp_business_accounts && 
                        business.owned_whatsapp_business_accounts.data && 
                        business.owned_whatsapp_business_accounts.data.length > 0) {
                        
                        const waba = business.owned_whatsapp_business_accounts.data[0];
                        businessAccountId = waba.id;
                        
                        if (waba.phone_numbers && waba.phone_numbers.data && waba.phone_numbers.data.length > 0) {
                            phoneNumberId = waba.phone_numbers.data[0].id;
                            phoneNumber = waba.phone_numbers.data[0].display_phone_number;
                        }
                        break;
                    }
                }
            }

            // If no WABA found via businesses, try direct endpoint
            if (!businessAccountId) {
                console.log('🔍 Trying direct WhatsApp Business Account endpoint...');
                
                const directUrl = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`;
                const directResponse = await fetch(directUrl);
                const directData = await directResponse.json();
                console.log('👤 User data:', directData);

                // Try to get shared WABA
                const sharedWabaUrl = `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${accessToken}`;
                const sharedWabaResponse = await fetch(sharedWabaUrl);
                const sharedWabaData = await sharedWabaResponse.json();
                
                console.log('📱 Shared WABA Data:', JSON.stringify(sharedWabaData, null, 2));

                if (sharedWabaData.data && sharedWabaData.data.length > 0) {
                    businessAccountId = sharedWabaData.data[0].id;
                    
                    // Get phone numbers for this WABA
                    const phonesUrl = `https://graph.facebook.com/v19.0/${businessAccountId}/phone_numbers?access_token=${accessToken}`;
                    const phonesResponse = await fetch(phonesUrl);
                    const phonesData = await phonesResponse.json();
                    
                    console.log('📞 Phone numbers:', JSON.stringify(phonesData, null, 2));
                    
                    if (phonesData.data && phonesData.data.length > 0) {
                        phoneNumberId = phonesData.data[0].id;
                        phoneNumber = phonesData.data[0].display_phone_number;
                    }
                }
            }

            if (!businessAccountId || !phoneNumberId) {
                throw new Error('לא נמצא חשבון WhatsApp Business. וודא שיש לך גישה לחשבון WhatsApp Business ומספר טלפון מאושר.');
            }

            console.log('✅ Found WABA:', businessAccountId);
            console.log('✅ Found Phone Number ID:', phoneNumberId);
            console.log('✅ Phone Number:', phoneNumber);

            // Register messages webhook subscription on WABA
            console.log('🔗 Registering messages webhook on WABA...');
            const webhookUrl = `https://graph.facebook.com/v21.0/${businessAccountId}/subscribed_apps`;
            
            const webhookResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscribed_fields: ['messages']
                })
            });

            const webhookResult = await webhookResponse.json();
            console.log('📡 Webhook registration result:', JSON.stringify(webhookResult, null, 2));

            if (webhookResult.error) {
                console.error('❌ Failed to register webhook:', webhookResult.error);
            } else {
                console.log('✅ Messages webhook registered successfully!');
            }

            // Request PIN from Meta (will be sent via SMS/call)
            console.log('📱 Requesting verification PIN from Meta...');
            
            try {
                const requestCodeUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/request_code`;
                const requestCodeResponse = await fetch(requestCodeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code_method: 'SMS', // or 'VOICE'
                        language: 'he_IL'
                    })
                });
                
                const requestCodeData = await requestCodeResponse.json();
                console.log('📱 Request code response:', JSON.stringify(requestCodeData, null, 2));
                
                if (!requestCodeData.error) {
                    console.log('✅ Verification PIN requested - SMS sent to phone');
                } else {
                    console.warn('⚠️ Could not request PIN:', requestCodeData.error.message);
                    // Continue anyway - user might already have the PIN
                }
            } catch (pinError) {
                console.warn('⚠️ PIN request failed:', pinError.message);
                // Continue anyway
            }

            // Save to WhatsAppSettings
            const company_id = state;
            
            if (!company_id) {
                throw new Error('חסר מזהה חברה');
            }

            console.log('💾 Saving WhatsApp settings...');
            
            const existingSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                company_id: company_id
            });
            
            const settingsData = {
                company_id: company_id,
                business_account_id: businessAccountId,
                phone_number_id: phoneNumberId,
                access_token: accessToken,
                webhook_verify_token: "cmo_crm_whatsapp_2024_secure_token",
                status: "מחובר",
                phone_number_status: "Pending", // Will be Approved after PIN verification
                last_sync: new Date().toISOString(),
                error_message: null
            };

            if (existingSettings.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSettings.update(
                    existingSettings[0].id, 
                    settingsData
                );
                console.log('✅ Updated WhatsApp settings');
            } else {
                await base44.asServiceRole.entities.WhatsAppSettings.create(settingsData);
                console.log('✅ Created WhatsApp settings');
            }

            // Return success page
            return new Response(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>WhatsApp מחובר!</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            text-align: center;
                            padding: 50px;
                            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                            margin: 0;
                        }
                        .success {
                            background: white;
                            padding: 50px 40px;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                            margin: 20px auto;
                            max-width: 550px;
                            animation: slideIn 0.5s ease-out;
                        }
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateY(-30px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        h1 { color: #25D366; margin-bottom: 10px; font-size: 36px; font-weight: bold; }
                        .checkmark {
                            font-size: 80px;
                            margin-bottom: 20px;
                            animation: pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                        }
                        @keyframes pop {
                            0% { transform: scale(0) rotate(0deg); }
                            50% { transform: scale(1.3) rotate(180deg); }
                            100% { transform: scale(1) rotate(360deg); }
                        }
                        p { color: #666; font-size: 18px; margin: 15px 0; line-height: 1.6; }
                        .details {
                            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                            padding: 20px;
                            border-radius: 12px;
                            margin-top: 25px;
                            font-size: 15px;
                            color: #1b5e20;
                            text-align: right;
                            border: 2px solid #81c784;
                        }
                        .details strong { color: #2e7d32; }
                    </style>
                </head>
                <body>
                    <div class="success">
                        <div class="checkmark">✅</div>
                        <h1>WhatsApp מחובר!</h1>
                        <p>חשבון WhatsApp Business חובר בהצלחה</p>
                        <div class="details">
                            <div><strong>📱 Business Account:</strong> ${businessAccountId}</div>
                            <div><strong>📞 מספר טלפון:</strong> ${phoneNumber || phoneNumberId}</div>
                            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                                <strong>⚠️ שלב נוסף נדרש:</strong><br>
                                קוד אימות נשלח למספר הטלפון ב-SMS<br>
                                אנא הזן את הקוד בהגדרות כדי להשלים את האישור
                            </div>
                        </div>
                        <p style="font-size: 14px; color: #999; margin-top: 25px;">החלון ייסגר בעוד 5 שניות...</p>
                    </div>
                    <script>
                        function sendMessage() {
                            if (window.opener) {
                                window.opener.postMessage({ 
                                    event: "whatsapp_connected",
                                    success: true,
                                    data: {
                                        business_account_id: "${businessAccountId}",
                                        phone_number_id: "${phoneNumberId}",
                                        phone_number: "${phoneNumber}",
                                        company_id: "${company_id}"
                                    }
                                }, "*");
                                return true;
                            }
                            return false;
                        }
                        
                        setTimeout(() => {
                            sendMessage();
                            setTimeout(() => window.close(), 5000);
                        }, 100);
                    </script>
                </body>
                </html>
            `, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        return new Response('Missing code parameter', { status: 400 });

    } catch (error) {
        console.error('❌ Error in WhatsApp callback:', error);
        
        return new Response(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>שגיאה</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #fee 0%, #fcc 100%);
                        margin: 0;
                    }
                    .error { 
                        background: white; 
                        padding: 40px; 
                        border-radius: 16px; 
                        margin: 20px auto; 
                        max-width: 500px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    }
                    h1 { color: #c00; font-size: 28px; margin-bottom: 15px; }
                    p { color: #666; line-height: 1.6; margin: 10px 0; }
                    .icon { font-size: 64px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <div class="icon">❌</div>
                    <h1>שגיאה בחיבור WhatsApp</h1>
                    <p><strong>פרטי השגיאה:</strong></p>
                    <p>${error.message}</p>
                    <p style="font-size: 14px; color: #999; margin-top: 20px;">החלון ייסגר בעוד 5 שניות...</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ 
                            event: "whatsapp_error",
                            error: "${error.message.replace(/\n/g, ' ')}"
                        }, "*");
                    }
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
});