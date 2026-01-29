import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const startTime = new Date();
        console.log('🔍 Function called at:', startTime.toISOString());
        
        // בדוק secret key
        const url = new URL(req.url);
        const secretKey = url.searchParams.get('secret');
        
        const expectedSecret = Deno.env.get('CRON_SECRET_KEY') || 'CMO_2025';
        if (secretKey !== expectedSecret) {
            return Response.json({ error: 'Invalid or missing secret key' }, { status: 403 });
        }
        
        const base44 = createClientFromRequest(req);

        console.log('🔍 Checking drip campaigns...');

        // טען את כל הקמפיינים הפעילים
        const activeCampaigns = await base44.asServiceRole.entities.WhatsAppDripCampaign.filter({
            is_active: true
        });

        console.log(`📋 Found ${activeCampaigns.length} active drip campaigns`);

        let messagesChecked = 0;
        let messagesSent = 0;
        const results = [];

        // טען הגדרות WhatsApp לכל חברה
        const waSettingsCache = {};

        for (const campaign of activeCampaigns) {
            if (!campaign.messages || campaign.messages.length === 0) {
                console.log(`⚠️ Campaign ${campaign.name} has no messages`);
                continue;
            }

            // טען מנויים פעילים
            const subscriptions = await base44.asServiceRole.entities.LeadDripSubscription.filter({
                campaign_id: campaign.id,
                is_active: true,
                completed: false
            });

            console.log(`📊 Campaign "${campaign.name}": ${subscriptions.length} active subscribers`);

            // טען הגדרות WhatsApp לחברה או לחברת האם (cache)
            if (!waSettingsCache[campaign.company_id]) {
                let waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                    company_id: campaign.company_id
                });
                
                // אם אין - בדוק חברת אם
                if (waSettings.length === 0) {
                    const companies = await base44.asServiceRole.entities.Company.filter({ id: campaign.company_id });
                    
                    if (companies.length > 0 && companies[0].parent_company_id) {
                        console.log('🔍 Checking parent company WhatsApp for drip campaign');
                        waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                            company_id: companies[0].parent_company_id
                        });
                        
                        if (waSettings.length > 0) {
                            console.log('✅ Using parent company WhatsApp for drip campaign');
                        }
                    }
                }
                
                waSettingsCache[campaign.company_id] = waSettings.length > 0 ? waSettings[0] : null;
            }

            const settings = waSettingsCache[campaign.company_id];
            
            if (!settings || !settings.access_token) {
                console.log(`⚠️ No WhatsApp settings for company ${campaign.company_id} or parent`);
                continue;
            }

            // עבור על כל מנוי
            for (const subscription of subscriptions) {
                messagesChecked++;

                // מצא את המסר הבא לשליחה
                const nextMessageIndex = subscription.last_message_sent + 1;
                
                if (nextMessageIndex >= campaign.messages.length) {
                    // סיים את כל המסרים
                    if (!subscription.completed) {
                        await base44.asServiceRole.entities.LeadDripSubscription.update(subscription.id, {
                            completed: true,
                            is_active: false
                        });
                        console.log(`✅ Subscription ${subscription.id} completed all messages`);
                    }
                    continue;
                }

                const nextMessage = campaign.messages[nextMessageIndex];
                
                // דלג על מסרים מיידיים - הם נשלחים ישירות מהדף
                if (nextMessage.is_immediate) {
                    console.log(`⏩ Message ${nextMessageIndex} is immediate - skipping cron job`);
                    continue;
                }

                // חישוב מתי צריך לשלוח (Israel timezone)
                const subscriptionDate = new Date(subscription.subscribed_date);
                
                // המר לזמן ישראל למצב ברור
                const israelNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                const subscriptionDateIsrael = new Date(subscriptionDate.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                
                // חשב את תאריך היעד
                const targetDate = new Date(subscriptionDateIsrael);
                targetDate.setDate(targetDate.getDate() + nextMessage.delay_days);

                // אם יש שעת שליחה ספציפית, הגדר אותה
                if (nextMessage.send_time) {
                    const [hours, minutes] = nextMessage.send_time.split(':');
                    targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                } else {
                    // אם אין שעת שליחה - שלח בתחילת היום
                    targetDate.setHours(0, 0, 0, 0);
                }

                console.log(`📅 Subscriber ${subscription.lead_id} - Message ${nextMessageIndex}:`);
                console.log(`   Subscription date (Israel): ${subscriptionDateIsrael.toISOString()}`);
                console.log(`   Target date (Israel): ${targetDate.toISOString()}`);
                console.log(`   Current time (Israel): ${israelNow.toISOString()}`);
                console.log(`   Delay days: ${nextMessage.delay_days}`);
                console.log(`   Send time: ${nextMessage.send_time || 'none'}`);
                console.log(`   Should send: ${targetDate <= israelNow}`);

                // בדוק אם הגיע הזמן לשלוח
                if (targetDate <= israelNow) {
                    // טען את הליד
                    const leads = await base44.asServiceRole.entities.Lead.filter({
                        id: subscription.lead_id
                    });

                    if (leads.length === 0 || !leads[0].phone) {
                        console.log(`⚠️ Lead ${subscription.lead_id} not found or has no phone`);
                        continue;
                    }

                    const lead = leads[0];
                    const cleanPhone = lead.phone.replace(/\D/g, '');
                    const phoneWithCountry = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.substring(1)}`;

                    console.log(`📤 Sending message ${nextMessageIndex} to ${lead.first_name} ${lead.last_name} (${phoneWithCountry})`);

                    try {
                        // טען את התבנית כדי לקבל את המיפוי והשפה הנכונה
                        let messageTemplate = await base44.asServiceRole.entities.WhatsAppTemplate.filter({
                            name: nextMessage.template_name,
                            company_id: campaign.company_id
                        });

                        // אם אין תבנית - בדוק חברת אם
                        if (messageTemplate.length === 0) {
                            const companies = await base44.asServiceRole.entities.Company.filter({ id: campaign.company_id });
                            if (companies.length > 0 && companies[0].parent_company_id) {
                                messageTemplate = await base44.asServiceRole.entities.WhatsAppTemplate.filter({
                                    name: nextMessage.template_name,
                                    company_id: companies[0].parent_company_id
                                });
                            }
                        }

                        const template = messageTemplate.length > 0 ? messageTemplate[0] : null;

                        if (!template) {
                            console.error(`⚠️ Template ${nextMessage.template_name} not found in database`);
                            continue;
                        }
                        
                        // בנה את הודעת ה-WhatsApp - רק אם יש פרמטרים דינמיים
                        const templateComponents = [];
                        
                        // Header - שלח רק אם יש media (image/video/document) שדורש URL דינמי
                        // Text header סטטי לא צריך component
                        if (template && template.header_type && template.header_type !== 'none' && template.header_content) {
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
                            // text header סטטי - לא שולחים component
                        }
                        
                        // הוסף body parameters רק אם יש משתנים בתבנית
                        if (template && template.variables && template.variables.length > 0) {
                            console.log(`  📊 Template has ${template.variables.length} variables`);
                            console.log(`  📊 Template variables_mapping:`, JSON.stringify(template.variables_mapping, null, 2));
                            
                            const parameters = [];
                            
                            for (let index = 0; index < template.variables.length; index++) {
                                const varName = template.variables[index];
                                const varNumber = String(index + 1);
                                let value = '';
                                
                                // נסה למצוא מיפוי - גם עם {{}} וגם בלי
                                let fieldName = null;
                                if (template.variables_mapping) {
                                    // נסה עם {{X}}
                                    if (template.variables_mapping[`{{${varNumber}}}`]) {
                                        fieldName = template.variables_mapping[`{{${varNumber}}}`];
                                    }
                                    // נסה עם X
                                    else if (template.variables_mapping[varNumber]) {
                                        fieldName = template.variables_mapping[varNumber];
                                    }
                                }
                                
                                if (fieldName) {
                                    value = lead[fieldName] || '';
                                    console.log(`  📍 Variable ${varNumber} (${varName}) -> field="${fieldName}" value="${value}"`);
                                } else {
                                    // אין מיפוי - השתמש בשם המשתנה עצמו כערך
                                    value = varName;
                                    console.log(`  ℹ️ Variable ${varNumber} (${varName}) - no mapping, using variable name as value`);
                                }
                                
                                // וודא שיש ערך תקין - אם ריק, שלח רווח
                                const textValue = String(value).trim() || ' ';
                                parameters.push({ type: 'text', text: textValue });
                            }

                            templateComponents.push({
                                type: 'body',
                                parameters: parameters
                            });
                        } else {
                            console.log(`  ℹ️ Template has no variables - sending without body parameters`);
                        }
                        
                        // השתמש בשפה של התבנית מהמסד נתונים (לא מה-nextMessage)
                        const templateLanguage = template.language || 'he';
                        console.log(`  🌐 Using template language: ${templateLanguage}`);

                        const messageBody = {
                            messaging_product: 'whatsapp',
                            to: phoneWithCountry,
                            type: 'template',
                            template: {
                                name: nextMessage.template_name,
                                language: { code: templateLanguage },
                                components: templateComponents.length > 0 ? templateComponents : undefined
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
                            console.log(`✅ Message sent: ${waData.messages[0].id}`);

                            // שמור הודעה
                            await base44.asServiceRole.entities.WhatsAppMessage.create({
                                message_id: waData.messages[0].id,
                                company_id: campaign.company_id,
                                lead_id: subscription.lead_id,
                                phone_number: phoneWithCountry,
                                phone_number_id: settings.phone_number_id,
                                direction: 'יוצא',
                                type: 'template',
                                content: `סדרת מסרים: ${campaign.name} - מסר ${nextMessageIndex}`,
                                template_name: nextMessage.template_name,
                                status: 'נשלח',
                                timestamp: new Date().toISOString(),
                                read: false
                            });

                            // עדכן מנוי
                            await base44.asServiceRole.entities.LeadDripSubscription.update(subscription.id, {
                                last_message_sent: nextMessageIndex,
                                last_sent_date: new Date().toISOString()
                            });

                            messagesSent++;
                            results.push({
                                campaign: campaign.name,
                                lead: `${lead.first_name} ${lead.last_name}`,
                                message_index: nextMessageIndex,
                                status: 'sent'
                            });
                        } else {
                            console.error(`❌ Failed to send message:`, waData);
                            results.push({
                                campaign: campaign.name,
                                lead: `${lead.first_name} ${lead.last_name}`,
                                message_index: nextMessageIndex,
                                status: 'failed',
                                error: waData.error?.message || 'Unknown error'
                            });
                        }
                    } catch (error) {
                        console.error(`❌ Error sending message:`, error);
                        results.push({
                            campaign: campaign.name,
                            lead: `${lead.first_name} ${lead.last_name}`,
                            message_index: nextMessageIndex,
                            status: 'error',
                            error: error.message
                        });
                    }

                    // המתן קצת בין שליחות
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.log(`✅ Checked ${messagesChecked} messages, sent ${messagesSent}`);

        const endTime = new Date();
        console.log('✅ Function completed at:', endTime.toISOString());

        return Response.json({
            success: true,
            campaigns_checked: activeCampaigns.length,
            messages_checked: messagesChecked,
            messages_sent: messagesSent,
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
        console.error('❌ Error in check-drip-campaigns:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});