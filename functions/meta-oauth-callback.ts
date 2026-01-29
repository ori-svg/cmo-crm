
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const META_APP_ID = '1509969996807376';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const REDIRECT_URI = 'https://cmo-crm.com/api/functions/meta-oauth-callback';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    
    console.log('📞 Meta Ads OAuth callback called');
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
                        <h1>שגיאה בחיבור Meta Ads</h1>
                        <p><strong>סיבה:</strong> ${errorDescription || error}</p>
                        <p style="font-size: 14px; color: #999;">החלון ייסגר אוטומטית בעוד 5 שניות...</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ 
                                event: "meta_error",
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

            // Get user info
            const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`;
            const meResponse = await fetch(meUrl);
            const meData = await meResponse.json();

            console.log('👤 User:', meData);

            // Get Ad Accounts
            let adAccountId = "";

            console.log('🔍 Fetching Ad Accounts...');
            
            const adAccountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`;
            const adAccountsResponse = await fetch(adAccountsUrl);
            const adAccountsData = await adAccountsResponse.json();

            console.log('📊 Ad Accounts Data:', JSON.stringify(adAccountsData, null, 2));

            if (adAccountsData.data && adAccountsData.data.length > 0) {
                adAccountId = adAccountsData.data[0].id;
                console.log('✅ Found Ad Account ID:', adAccountId);
            } else {
                throw new Error('לא נמצאו חשבונות מודעות. וודא שיש לך גישה לחשבונות Meta Ads.');
            }

            // ✅ NEW: Get Pixel ID for Conversions API
            let pixelId = "";
            
            console.log('🔍 Fetching Pixels for Conversions API...');
            
            const pixelsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/adspixels?fields=id,name&access_token=${accessToken}`;
            const pixelsResponse = await fetch(pixelsUrl);
            const pixelsData = await pixelsResponse.json();

            console.log('🎯 Pixels Data:', JSON.stringify(pixelsData, null, 2));

            if (pixelsData.data && pixelsData.data.length > 0) {
                pixelId = pixelsData.data[0].id;
                console.log('✅ Found Pixel ID:', pixelId);
            } else {
                console.warn('⚠️ No pixels found - Conversions API will not work without Pixel ID');
            }

            // Save to database
            const company_id = state;
            
            if (!company_id) {
                throw new Error('חסר מזהה חברה');
            }

            console.log('💾 Saving Meta Ads settings...');
            
            const existingSettings = await base44.asServiceRole.entities.MetaSettings.filter({
                company_id: company_id
            });
            
            const settingsData = {
                access_token: accessToken,
                ad_account_id: adAccountId,
                pixel_id: pixelId || null,  // ✅ Save Pixel ID
                status: "מחובר",
                last_refresh: new Date().toISOString(),
                error_message: null,
                company_id: company_id
            };

            if (existingSettings.length > 0) {
                await base44.asServiceRole.entities.MetaSettings.update(
                    existingSettings[0].id, 
                    settingsData
                );
                console.log('✅ Updated Meta Ads settings');
            } else {
                await base44.asServiceRole.entities.MetaSettings.create(settingsData);
                console.log('✅ Created Meta Ads settings');
            }

            // ✅ NEW: Sync campaigns automatically after connection
            console.log('🔄 Starting automatic campaign sync...');
            try {
                // Get date range (last 30 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                let totalSynced = 0;
                let currentDate = new Date(startDate);

                // Loop through each day in range
                while (currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    
                    console.log(`📅 Syncing data for ${dateStr}`);

                    try {
                        const response = await fetch(
                            `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
                            `time_range={"since":"${dateStr}","until":"${dateStr}"}&` +
                            `level=campaign&` +
                            `fields=campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr,actions,action_values&` +
                            `access_token=${accessToken}`
                        );

                        if (!response.ok) {
                            console.error(`❌ Error for ${dateStr}:`, response.status);
                            currentDate.setDate(currentDate.getDate() + 1);
                            continue;
                        }

                        const result = await response.json();
                        const campaigns = result.data || [];

                        console.log(`  Found ${campaigns.length} campaigns for ${dateStr}`);

                        // Save each campaign for that day
                        for (const campaign of campaigns) {
                            try {
                                // Extract leads and purchases from actions
                                let leads = 0;
                                let purchases = 0;
                                let purchase_value = 0;

                                if (campaign.actions) {
                                    for (const action of campaign.actions) {
                                        if (action.action_type === 'lead') {
                                            leads = parseInt(action.value) || 0;
                                        } else if (action.action_type === 'purchase' || action.action_type === 'offsite_conversion.fb_pixel_purchase') {
                                            purchases = parseInt(action.value) || 0;
                                        }
                                    }
                                }

                                if (campaign.action_values) {
                                    for (const value of campaign.action_values) {
                                        if (value.action_type === 'purchase' || value.action_type === 'offsite_conversion.fb_pixel_purchase') {
                                            purchase_value = parseFloat(value.value) || 0;
                                        }
                                    }
                                }

                                const campaignData = {
                                    campaign_id: campaign.campaign_id,
                                    campaign_name: campaign.campaign_name,
                                    account_id: adAccountId,
                                    company_id: company_id,
                                    date: dateStr,
                                    spend: parseFloat(campaign.spend) || 0,
                                    impressions: parseInt(campaign.impressions) || 0,
                                    clicks: parseInt(campaign.clicks) || 0,
                                    reach: parseInt(campaign.reach) || 0,
                                    cpc: parseFloat(campaign.cpc) || 0,
                                    cpm: parseFloat(campaign.cpm) || 0,
                                    ctr: parseFloat(campaign.ctr) || 0,
                                    leads: leads,
                                    cost_per_lead: leads > 0 ? (parseFloat(campaign.spend) || 0) / leads : 0,
                                    purchases: purchases,
                                    purchase_value: purchase_value,
                                    roas: (parseFloat(campaign.spend) || 0) > 0 ? purchase_value / (parseFloat(campaign.spend) || 0) : 0,
                                    conversion_value: purchase_value
                                };

                                // Check if record exists for this campaign, date, and company
                                const existing = await base44.asServiceRole.entities.MetaCampaign.filter({
                                    campaign_id: campaign.campaign_id,
                                    date: dateStr,
                                    company_id: company_id
                                });

                                if (existing.length > 0) {
                                    await base44.asServiceRole.entities.MetaCampaign.update(existing[0].id, campaignData);
                                } else {
                                    await base44.asServiceRole.entities.MetaCampaign.create(campaignData);
                                }

                                totalSynced++;
                            } catch (error) {
                                console.error(`Error syncing campaign ${campaign.campaign_name} for ${dateStr}:`, error);
                            }
                        }

                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (error) {
                        console.error(`Error syncing date ${dateStr}:`, error);
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }

                console.log(`✅ Total synced: ${totalSynced} campaign records`);
            } catch (syncError) {
                console.error('⚠️ Error during auto-sync:', syncError);
                // Don't fail the whole connection if sync fails
            }

            // Return success page
            return new Response(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>Meta Ads מחובר!</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            text-align: center;
                            padding: 50px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                        h1 { color: #667eea; margin-bottom: 10px; font-size: 36px; font-weight: bold; }
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
                            background: linear-gradient(135deg, #f3e7ff 0%, #e7d5ff 100%);
                            padding: 20px;
                            border-radius: 12px;
                            margin-top: 25px;
                            font-size: 15px;
                            color: #5b21b6;
                            text-align: right;
                            border: 2px solid #c4b5fd;
                        }
                        .details strong { color: #4c1d95; }
                        .spinner {
                            border: 3px solid #f3f3f3;
                            border-top: 3px solid #667eea;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 20px auto;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </head>
                <body>
                    <div class="success">
                        <div class="checkmark">✅</div>
                        <h1>Meta Ads מחובר!</h1>
                        <p>חשבון Meta Ads חובר בהצלחה והנתונים מסתנכרנים עכשיו...</p>
                        <div class="spinner"></div>
                        <div class="details">
                            <div><strong>📊 חשבון מודעות:</strong> ${adAccountId}</div>
                            ${pixelId ? `<div><strong>🎯 Pixel ID:</strong> ${pixelId}</div>` : ''}
                            <div style="margin-top: 10px;"><strong>🎯 סטטוס:</strong> מחובר ופעיל</div>
                            <div style="margin-top: 10px;"><strong>🔄 סנכרון:</strong> שואב נתוני קמפיינים מ-30 הימים האחרונים</div>
                            <div style="margin-top: 10px;"><strong>📈 מה עכשיו:</strong> המתן כ-30 שניות ולאחר מכן רענן את הדאשבורד</div>
                        </div>
                        <p style="font-size: 14px; color: #999; margin-top: 25px;">החלון ייסגר בעוד 10 שניות...</p>
                    </div>
                    <script>
                        function sendMessage() {
                            if (window.opener) {
                                window.opener.postMessage({ 
                                    event: "meta_connected",
                                    success: true,
                                    data: {
                                        ad_account_id: "${adAccountId}",
                                        pixel_id: "${pixelId}",
                                        company_id: "${company_id}"
                                    }
                                }, "*");
                                return true;
                            }
                            return false;
                        }
                        
                        setTimeout(() => {
                            sendMessage();
                            setTimeout(() => window.close(), 10000);
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
        console.error('❌ Error in Meta Ads callback:', error);
        
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
                    <h1>שגיאה בחיבור Meta Ads</h1>
                    <p><strong>פרטי השגיאה:</strong></p>
                    <p>${error.message}</p>
                    <p style="font-size: 14px; color: #999; margin-top: 20px;">החלון ייסגר בעוד 5 שניות...</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ 
                            event: "meta_error",
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
