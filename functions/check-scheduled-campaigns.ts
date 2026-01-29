import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const startTime = new Date();
        console.log('🔍 Function called at:', startTime.toISOString());
        
        const url = new URL(req.url);
        const secretKey = url.searchParams.get('secret');
        
        // בדוק secret key
        const expectedSecret = Deno.env.get('CRON_SECRET_KEY') || 'CMO_2025';
        if (secretKey !== expectedSecret) {
            return Response.json({ error: 'Invalid or missing secret key' }, { status: 403 });
        }
        
        const base44 = createClientFromRequest(req);

        console.log('🔍 Checking for scheduled campaigns...');

        const scheduledCampaigns = await base44.asServiceRole.entities.WhatsAppCampaign.filter({
            status: 'מתוזמן'
        });

        console.log(`📋 Found ${scheduledCampaigns.length} scheduled campaigns`);

        // זמן נוכחי ב-UTC
        const now = new Date();
        
        console.log('⏰ Current time (UTC):', now.toISOString());
        console.log('⏰ Current time (Israel):', now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }));

        let processed = 0;
        let skipped = 0;
        const results = [];

        for (const campaign of scheduledCampaigns) {
            if (!campaign.scheduled_time) {
                console.log(`⚠️ Campaign ${campaign.name} has no scheduled_time, skipping`);
                skipped++;
                continue;
            }

            // הזמן המתוזמן הוא ISO string (UTC)
            const scheduledDate = new Date(campaign.scheduled_time);
            
            // וידוא שהתאריך תקין
            if (isNaN(scheduledDate.getTime())) {
                console.error(`❌ Invalid scheduled_time for campaign ${campaign.name}:`, campaign.scheduled_time);
                skipped++;
                continue;
            }
            
            const israelTime = scheduledDate.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
            const nowIsraelTime = now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
            
            console.log(`📅 Campaign: ${campaign.name}`);
            console.log(`   Scheduled (UTC): ${scheduledDate.toISOString()}`);
            console.log(`   Scheduled (Israel): ${israelTime}`);
            console.log(`   Now (UTC): ${now.toISOString()}`);
            console.log(`   Now (Israel): ${nowIsraelTime}`);
            console.log(`   Should send: ${scheduledDate <= now}`);

            // השווה זמנים ב-UTC
            if (scheduledDate <= now) {
                console.log(`⏰ Time to send campaign: ${campaign.name}`);

                try {
                    const sendResponse = await base44.asServiceRole.functions.invoke('send-whatsapp-campaign', {
                        campaign_id: campaign.id,
                        company_id: campaign.company_id
                    });

                    if (sendResponse.data?.success) {
                        const data = sendResponse.data;
                        console.log(`✅ Campaign ${campaign.name} batch sent - ${data.sent} sent, ${data.remaining || 0} remaining`);
                        processed++;
                        results.push({
                            campaign: campaign.name,
                            status: data.status === 'בתהליך' ? 'processing' : 'success',
                            sent: data.sent || 0,
                            remaining: data.remaining || 0
                        });
                    } else {
                        const errorMsg = sendResponse.data?.error || sendResponse.error || 'Unknown error';
                        console.error(`❌ Failed to send campaign ${campaign.name}:`, errorMsg);
                        
                        await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign.id, {
                            status: 'נכשל'
                        });
                        
                        results.push({
                            campaign: campaign.name,
                            status: 'failed',
                            error: errorMsg
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error sending campaign ${campaign.name}:`, error);
                    
                    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign.id, {
                        status: 'נכשל'
                    });
                    
                    results.push({
                        campaign: campaign.name,
                        status: 'error',
                        error: error.message
                    });
                }
            } else {
                skipped++;
                const minutesUntil = Math.round((scheduledDate - now) / 1000 / 60);
                console.log(`⏭️ Campaign ${campaign.name} scheduled for ${minutesUntil} minutes from now`);
            }
        }

        const endTime = new Date();
        console.log('✅ Function completed at:', endTime.toISOString());

        return Response.json({
            success: true,
            checked: scheduledCampaigns.length,
            processed,
            skipped,
            current_time_utc: endTime.toISOString(),
            current_time_israel: endTime.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
            execution_start: startTime.toISOString(),
            execution_end: endTime.toISOString(),
            results
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('❌ Error in check-scheduled-campaigns:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});