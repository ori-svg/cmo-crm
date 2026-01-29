import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { campaign_id, company_id } = await req.json();

        if (!campaign_id || !company_id) {
            return Response.json({ 
                success: false,
                error: 'Missing campaign_id or company_id' 
            }, { status: 400 });
        }

        const campaigns = await base44.asServiceRole.entities.WhatsAppCampaign.filter({ id: campaign_id });
        
        if (campaigns.length === 0) {
            return Response.json({ 
                success: false,
                error: 'Campaign not found' 
            }, { status: 404 });
        }

        const campaign = campaigns[0];

        // טען את התבנית - מהחברה או מחברת האם
        let templates = await base44.asServiceRole.entities.WhatsAppTemplate.filter({ 
            name: campaign.template_name,
            company_id: company_id 
        });
        
        // אם אין תבנית בחברה - בדוק בחברת האם
        if (templates.length === 0) {
            const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
            
            if (companies.length > 0 && companies[0].parent_company_id) {
                console.log('🔍 Checking parent company for template');
                templates = await base44.asServiceRole.entities.WhatsAppTemplate.filter({ 
                    name: campaign.template_name,
                    company_id: companies[0].parent_company_id
                });
            }
        }
        
        if (templates.length === 0) {
            await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
                status: 'נכשל'
            });
            return Response.json({ 
                success: false,
                error: `Template '${campaign.template_name}' not found` 
            }, { status: 404 });
        }

        const template = templates[0];

        // בדוק אם זה קמפיין מתוזמן שעדיין לא הגיע זמנו
        if (campaign.scheduled_time) {
            const scheduledDate = new Date(campaign.scheduled_time);
            const now = new Date();
            
            console.log('⏰ Checking scheduled time:');
            console.log('   Scheduled (UTC):', scheduledDate.toISOString());
            console.log('   Now (UTC):', now.toISOString());
            
            // השווה ב-UTC
            if (scheduledDate > now) {
                const minutesUntil = Math.round((scheduledDate - now) / 1000 / 60);
                return Response.json({ 
                    success: true,
                    message: 'Campaign scheduled for later',
                    scheduled_time: campaign.scheduled_time,
                    time_until_send: `${minutesUntil} minutes`
                });
            }
        }

        // טען הגדרות WhatsApp - של החברה או חברת האם
        let whatsappSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({ 
            company_id: company_id 
        });

        // אם אין הגדרות - בדוק אם זו חברת בת עם חברת אם שיש לה הגדרות
        if (whatsappSettings.length === 0) {
            const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
            
            if (companies.length > 0 && companies[0].parent_company_id) {
                console.log('🔍 Checking parent company WhatsApp settings');
                whatsappSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                    company_id: companies[0].parent_company_id
                });
                
                if (whatsappSettings.length > 0) {
                    console.log('✅ Using parent company WhatsApp settings');
                }
            }
        }

        if (whatsappSettings.length === 0 || !whatsappSettings[0].access_token) {
            await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
                status: 'נכשל'
            });
            return Response.json({ 
                success: false,
                error: 'WhatsApp not configured for company or parent' 
            }, { status: 400 });
        }

        const settings = whatsappSettings[0];

        // עדכן סטטוס לבתהליך רק כשמתחילים לשלוח
        await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
            status: 'בתהליך'
        });

        let recipients = [];

        // ✅ NEW: Handle CSV recipient type
        if (campaign.recipient_type === 'csv') {
            console.log('📋 Processing CSV campaign with phone numbers:', campaign.selected_recipients);
            
            // selected_recipients contains phone numbers directly
            if (campaign.selected_recipients && Array.isArray(campaign.selected_recipients)) {
                recipients = campaign.selected_recipients.map(phone => ({
                    phone: phone,
                    id: null, // No entity ID for CSV recipients
                    type: 'csv'
                }));
            }
            
            console.log(`📊 Found ${recipients.length} phone numbers from CSV`);
        } else if (campaign.recipient_type === 'leads') {
            let leadsQuery = { company_id: company_id };
            
            // אם יש selected_recipients - זו תמיד המגבלה העיקרית
            if (campaign.selected_recipients && campaign.selected_recipients.length > 0) {
                console.log('✅ Using selected recipients only:', campaign.selected_recipients.length);
                const allLeads = await base44.asServiceRole.entities.Lead.filter(leadsQuery);
                recipients = allLeads.filter(lead => campaign.selected_recipients.includes(lead.id));
            } else if (campaign.filter_by_proposal) {
                console.log('✅ Filtering by proposal:', campaign.filter_by_proposal);
                const allLeads = await base44.asServiceRole.entities.Lead.filter(leadsQuery);
                recipients = allLeads.filter(lead => 
                    lead.proposals && lead.proposals.includes(campaign.filter_by_proposal)
                );
            } else if (campaign.filter_by_tags && campaign.filter_by_tags.length > 0) {
                const tagsMode = campaign.tags_filter_mode || 'or'; // ברירת מחדל "or" לתאימות לאחור
                console.log('✅ Filtering by tags:', campaign.filter_by_tags, 'mode:', tagsMode);
                const allLeads = await base44.asServiceRole.entities.Lead.filter(leadsQuery);
                
                if (tagsMode === 'and') {
                    // כל הטאגים חייבים להיות
                    recipients = allLeads.filter(lead =>
                        lead.tags && campaign.filter_by_tags.every(tag => lead.tags.includes(tag))
                    );
                } else {
                    // לפחות אחד מהטאגים
                    recipients = allLeads.filter(lead =>
                        lead.tags && campaign.filter_by_tags.some(tag => lead.tags.includes(tag))
                    );
                }
            } else {
                console.log('✅ Using all leads (no filter)');
                recipients = await base44.asServiceRole.entities.Lead.filter(leadsQuery);
            }

            recipients = recipients.filter(r => r.phone);
        } else if (campaign.recipient_type === 'clients') {
            const clientsQuery = { company_id: company_id };
            const allClients = await base44.asServiceRole.entities.Client.filter(clientsQuery);
            
            if (campaign.selected_recipients && campaign.selected_recipients.length > 0) {
                recipients = allClients.filter(client => campaign.selected_recipients.includes(client.id));
            } else {
                recipients = allClients;
            }

            recipients = recipients.filter(r => r.phone);
        }

        // סינון לפי טאגים להחרגה - בדוק גם טאגים ריקים או undefined
        if (campaign.excluded_tags && campaign.excluded_tags.length > 0 && campaign.recipient_type !== 'csv') {
            console.log('🚫 Filtering out excluded tags:', campaign.excluded_tags);
            const beforeCount = recipients.length;
            
            recipients = recipients.filter(recipient => {
                // אם אין טאגים בכלל - אפשר לשלוח
                if (!recipient.tags || !Array.isArray(recipient.tags) || recipient.tags.length === 0) {
                    return true;
                }
                
                // בדוק אם יש טאג מוחרג
                const hasExcludedTag = campaign.excluded_tags.some(excludedTag => 
                    recipient.tags.includes(excludedTag)
                );
                
                if (hasExcludedTag) {
                    console.log(`🚫 Excluding recipient ${recipient.phone} with tags:`, recipient.tags);
                }
                
                return !hasExcludedTag;
            });
            
            console.log(`🚫 Excluded ${beforeCount - recipients.length} recipients due to excluded tags`);
        }

        // הגבלת כמות
        if (campaign.max_recipients_per_batch && campaign.max_recipients_per_batch > 0) {
            recipients = recipients.slice(0, campaign.max_recipients_per_batch);
        }

        console.log(`📊 Final recipients for campaign ${campaign.name}: ${recipients.length}`);

        let sent = 0;
        let failed = 0;

        console.log(`📦 Starting to send ${recipients.length} messages in parallel batches`);

        // שלח בבאצ'ים מקבילים של 20 הודעות כל פעם
        const BATCH_SIZE = 20;
        const DELAY_BETWEEN_BATCHES = 3000; // 3 שניות בין באצ'ים

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            console.log(`📦 Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipients.length / BATCH_SIZE)} (${batch.length} messages)`);

            const promises = batch.map(async (recipient) => {
                try {
                    const rawPhone = typeof recipient === 'string' ? recipient : recipient.phone;

                    if (!rawPhone) {
                        return { success: false };
                    }

                    const phone = rawPhone.replace(/[^0-9]/g, '');
                    const phoneWithCountry = phone.startsWith('972') ? phone : `972${phone.substring(1)}`;

                    const templateComponents = [];
                    
                    // הוסף header רק אם יש תוכן דינמי
                    try {
                        if (template.header_type && template.header_content) {
                            const hasHttpLink = typeof template.header_content === 'string' && template.header_content.startsWith('http');
                            
                            if (hasHttpLink) {
                                if (template.header_type === 'image') {
                                    templateComponents.push({
                                        type: 'header',
                                        parameters: [{
                                            type: 'image',
                                            image: { link: template.header_content }
                                        }]
                                    });
                                } else if (template.header_type === 'video') {
                                    templateComponents.push({
                                        type: 'header',
                                        parameters: [{
                                            type: 'video',
                                            video: { link: template.header_content }
                                        }]
                                    });
                                } else if (template.header_type === 'document') {
                                    templateComponents.push({
                                        type: 'header',
                                        parameters: [{
                                            type: 'document',
                                            document: { link: template.header_content }
                                        }]
                                    });
                                }
                            } else if (template.header_type === 'text' && template.header_content.includes('{{1}}')) {
                                // טקסט דינמי בheader
                                const headerValue = typeof recipient === 'object' ? (recipient[template.variables_mapping?.['0']] || template.header_content) : template.header_content;
                                templateComponents.push({
                                    type: 'header',
                                    parameters: [{
                                        type: 'text',
                                        text: headerValue
                                    }]
                                });
                            }
                        }
                    } catch (headerError) {
                        console.log('⚠️ Header processing error:', headerError.message);
                    }
                    
                    // שלח body parameters רק אם יש מיפוי משתנים מוגדר
                    if (template.variables_mapping && Object.keys(template.variables_mapping).length > 0) {
                        const parameters = Object.entries(template.variables_mapping).map(([varIndex, fieldName]) => {
                            let value = '-';
                            
                            // קח את הערך מהנמען (lead או client - עבור CSV לא יהיה שדה)
                            if (typeof recipient === 'object' && recipient[fieldName]) {
                                value = String(recipient[fieldName]);
                            }
                            
                            // אם יש ערך ידני בקמפיין - הוא עוקף את המיפוי
                            if (campaign.variables && campaign.variables[varIndex]) {
                                value = campaign.variables[varIndex];
                            }
                            
                            return { type: 'text', text: value };
                        });

                        templateComponents.push({
                            type: 'body',
                            parameters: parameters
                        });
                    }

                    const waResponse = await fetch(
                        `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${settings.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messaging_product: 'whatsapp',
                                to: phoneWithCountry,
                                type: 'template',
                                template: {
                                    name: campaign.template_name,
                                    language: {
                                        code: campaign.template_language || 'he'
                                    },
                                    components: templateComponents.length > 0 ? templateComponents : undefined
                                }
                            })
                        }
                    );

                    const waResult = await waResponse.json();

                    if (waResponse.ok && waResult.messages && waResult.messages[0].id) {
                        return { success: true, phone: phoneWithCountry };
                    } else {
                        console.log(`❌ Failed ${phoneWithCountry}:`, waResult.error?.message);
                        return { success: false };
                    }
                } catch (error) {
                    console.error(`❌ Error:`, error.message);
                    return { success: false };
                }
            });

            const results = await Promise.all(promises);
            
            results.forEach(result => {
                if (result.success) {
                    sent++;
                } else {
                    failed++;
                }
            });

            console.log(`📊 Batch complete: Total ${sent} sent, ${failed} failed`);

            // המתן בין באצ'ים
            if (i + BATCH_SIZE < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        console.log(`✅ Complete: ${sent} sent, ${failed} failed`);

        // עדכן קמפיין עם תוצאות
        let finalStatus = 'הושלם';
        if (sent === 0 && failed > 0) {
            finalStatus = 'נכשל';
        } else if (failed > 0) {
            finalStatus = 'הושלם חלקית';
        }

        // עדכון אחד בלבד של הקמפיין
        await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
            status: finalStatus,
            total_sent: sent,
            total_failed: failed
        });

        console.log(`✅ Done - returning response`);

        return Response.json({
            success: true,
            sent,
            failed,
            total: recipients.length,
            status: finalStatus
        });

    } catch (error) {
        console.error('❌ Error in send-whatsapp-campaign:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});