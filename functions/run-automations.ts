import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { trigger_type, event_data } = await req.json();

        console.log('🔄 Running automations for trigger:', trigger_type);
        console.log('📊 Event data:', JSON.stringify(event_data, null, 2));

        // קבל את ה-company_id של הליד/אירוע
        const companyId = event_data.lead?.company_id || event_data.client?.company_id || event_data.company_id;
        
        if (!companyId) {
            console.error('❌ No company_id in event_data - cannot run automations');
            return Response.json({ success: false, error: 'No company_id' }, { status: 400 });
        }

        // קודם נטען את כל האוטומציות הפעילות של החברה
        const allCompanyAutomations = await base44.asServiceRole.entities.Automation.filter({
            company_id: companyId,
            is_active: true
        });
        
        console.log(`📋 Total active automations for company: ${allCompanyAutomations.length}`);
        
        // הצג את כל ה-trigger_types
        allCompanyAutomations.forEach(auto => {
            console.log(`   - "${auto.name}": trigger_type="${auto.trigger_type}", config:`, JSON.stringify(auto.trigger_config, null, 2));
        });
        
        // עכשיו נסנן לפי trigger_type
        const allAutomations = allCompanyAutomations.filter(a => a.trigger_type === trigger_type);
        
        console.log(`🔍 Found ${allAutomations.length} matching automations for trigger: "${trigger_type}"`);

        let executedCount = 0;

        for (const automation of allAutomations) {
            console.log(`🔍 Checking automation: ${automation.name}`);

            // בדיקה לפי סוג הטריגר
            let shouldExecute = true;

            // עבור שינוי סטטוס - חייב להתאים לסטטוס הספציפי
            if (trigger_type === 'שינוי סטטוס') {
                if (automation.trigger_condition) {
                    if (event_data.newStatus !== automation.trigger_condition) {
                        console.log(`⏭️ Status changed to "${event_data.newStatus}" but expects "${automation.trigger_condition}" - skipping`);
                        shouldExecute = false;
                    }
                } else {
                    console.log(`⏭️ No specific status defined - skipping`);
                    shouldExecute = false;
                }
            }

            // עבור הודעת WhatsApp - בדוק תנאי הפעלה
            if (trigger_type === 'התקבלה הודעת WhatsApp') {
                const triggerMode = automation.trigger_config?.trigger_mode || 'any';
                
                console.log(`   🔍 Automation "${automation.name}": trigger_mode="${triggerMode}"`);
                
                if (triggerMode === 'button') {
                    // מצב כפתור - בדוק button_id
                    const expectedButtonId = automation.trigger_config?.button_id;
                    if (!expectedButtonId) {
                        console.log(`   ⚠️ Button mode but no button_id defined - skipping`);
                        shouldExecute = false;
                    } else {
                        const quickReplyId = event_data.message?.quick_reply_id || '';
                        const listReplyId = event_data.message?.list_reply_id || '';
                        
                        console.log(`   🔍 Checking button match: expected="${expectedButtonId}", quick_reply="${quickReplyId}", list_reply="${listReplyId}"`);
                        
                        if (quickReplyId !== expectedButtonId && listReplyId !== expectedButtonId) {
                            console.log(`   ⏭️ Button ID doesn't match - skipping`);
                            shouldExecute = false;
                        } else {
                            console.log(`   ✅ Button match found!`);
                        }
                    }
                } else if (triggerMode === 'text') {
                    // מצב טקסט - בדוק תוכן הודעה
                    const expectedText = automation.trigger_config?.message_text;
                    if (!expectedText) {
                        console.log(`   ⚠️ Text mode but no message_text defined - skipping`);
                        shouldExecute = false;
                    } else {
                        const messageContent = event_data.message?.content || '';
                        
                        console.log(`   🔍 Checking text match: expected="${expectedText}", message="${messageContent}"`);
                        
                        if (!messageContent.includes(expectedText)) {
                            console.log(`   ⏭️ Text doesn't match - skipping`);
                            shouldExecute = false;
                        } else {
                            console.log(`   ✅ Text match found!`);
                        }
                    }
                } else {
                    // מצב "any" - מופעל על כל הודעה
                    console.log(`   ✅ "any" mode - will trigger on this message`);
                }
            }

            if (!shouldExecute) {
                continue;
            }

            console.log(`▶️ Executing automation: ${automation.name}`);

            // בדוק אם זו אוטומציה מסוג Flow או פשוטה
            if (automation.flow_definition && automation.flow_definition.modules) {
                console.log('🔄 Executing flow automation...');
                await executeFlowAutomation(base44, automation, event_data);
                executedCount++;
            } else {
                // אוטומציה פשוטה
                if (automation.action_type === 'שליחת הודעת וואטסאפ חופשית') {
                    await executeFreeWhatsAppAction(base44, automation, event_data);
                    executedCount++;
                } else if (automation.action_type === 'שליחת WhatsApp') {
                    await executeWhatsAppTemplateAction(base44, automation, event_data);
                    executedCount++;
                }
            }

            // עדכן את האוטומציה
            await base44.asServiceRole.entities.Automation.update(automation.id, {
                last_run: new Date().toISOString(),
                run_count: (automation.run_count || 0) + 1
            });
        }

        console.log(`✅ Executed ${executedCount} automations`);

        return Response.json({ 
            success: true,
            executed_count: executedCount
        });

    } catch (error) {
        console.error('❌ Error running automations:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

async function executeFreeWhatsAppAction(base44, automation, eventData) {
    try {
        console.log('💬 Executing free WhatsApp message...');
        
        const lead = eventData.lead;
        if (!lead || !lead.phone) {
            console.log('❌ No lead or phone number');
            return;
        }

        const config = automation.action_config;
        if (!config?.message_text) {
            console.log('❌ No message text configured');
            return;
        }

        // החלף placeholders
        let messageText = config.message_text;
        messageText = messageText.replace(/\{\{lead\.first_name\}\}/g, lead.first_name || '');
        messageText = messageText.replace(/\{\{lead\.last_name\}\}/g, lead.last_name || '');
        messageText = messageText.replace(/\{\{lead\.phone\}\}/g, lead.phone || '');
        messageText = messageText.replace(/\{\{lead\.email\}\}/g, lead.email || '');

        console.log('📞 Sending free WhatsApp message to:', lead.phone);

        const response = await base44.functions.invoke('send-free-whatsapp-message', {
            phone: lead.phone,
            message_text: messageText,
            company_id: lead.company_id,
            lead_id: lead.id
        });

        if (response.data?.success) {
            console.log('✅ Free WhatsApp message sent successfully');
        } else {
            console.error('❌ Failed to send free WhatsApp message:', response.data);
        }
    } catch (error) {
        console.error('❌ Error executing free WhatsApp action:', error);
    }
}

async function executeWhatsAppTemplateAction(base44, automation, eventData) {
    try {
        console.log('📱 Executing WhatsApp template message...');
        
        const lead = eventData.lead;
        if (!lead || !lead.phone) {
            console.log('❌ No lead or phone number');
            return;
        }

        const config = automation.action_config;
        if (!config?.template_name) {
            console.log('❌ No template name configured');
            return;
        }

        console.log('📞 Sending WhatsApp template to:', lead.phone);

        const response = await base44.functions.invoke('send-whatsapp-message', {
            phone: lead.phone,
            template_name: config.template_name,
            company_id: lead.company_id,
            lead_id: lead.id,
            lead_data: lead
        });

        if (response.data?.success) {
            console.log('✅ WhatsApp template sent successfully');
        } else {
            console.error('❌ Failed to send WhatsApp template:', response.data);
        }
    } catch (error) {
        console.error('❌ Error executing WhatsApp template action:', error);
    }
}

async function executeFlowAutomation(base44, automation, eventData) {
    try {
        console.log('🔄 Starting flow execution...');
        const modules = automation.flow_definition.modules;
        
        for (let i = 0; i < modules.length; i++) {
            const module = modules[i];
            console.log(`  → Module ${i + 1}: ${module.module_type}`);
            
            if (module.type === 'trigger') {
                // דלג על טריגר - כבר בדקנו אותו
                continue;
            }
            
            if (module.type === 'action') {
                await executeFlowAction(base44, module, eventData);
            }
        }
        
        console.log('✅ Flow execution completed');
    } catch (error) {
        console.error('❌ Error executing flow:', error);
    }
}

async function executeFlowAction(base44, module, eventData) {
    const config = module.config;
    const lead = eventData.lead;
    
    if (!lead) {
        console.log('  ❌ No lead data');
        return;
    }
    
    if (module.module_type === 'add_tag') {
        console.log('  🏷️ Adding tag to lead...', {
            leadId: lead.id,
            currentTags: lead.tags,
            tagToAdd: config.tag
        });
        
        if (!config?.tag) {
            console.log('  ❌ No tag configured');
            return;
        }
        
        try {
            // טען את הליד העדכני
            const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead.id });
            if (leads.length === 0) {
                console.log('  ❌ Lead not found');
                return;
            }
            
            const currentLead = leads[0];
            const currentTags = currentLead.tags || [];
            
            if (!currentTags.includes(config.tag)) {
                const newTags = [...currentTags, config.tag];
                console.log('  💾 Updating tags:', newTags);
                
                await base44.asServiceRole.entities.Lead.update(lead.id, {
                    tags: newTags
                });
                
                console.log('  ✅ Tag added successfully');
            } else {
                console.log('  ℹ️ Tag already exists');
            }
        } catch (error) {
            console.error('  ❌ Error adding tag:', error);
        }
        
    } else if (module.module_type === 'change_status') {
        console.log('  🔄 Changing status...');
        
        if (!config?.status) {
            console.log('  ❌ No status configured');
            return;
        }
        
        try {
            await base44.asServiceRole.entities.Lead.update(lead.id, {
                status: config.status
            });
            console.log('  ✅ Status changed to:', config.status);
        } catch (error) {
            console.error('  ❌ Error changing status:', error);
        }
        
    } else if (module.module_type === 'subscribe_to_drip') {
        console.log('  📩 Subscribing to drip campaign...');
        
        if (!config?.drip_campaign_id) {
            console.log('  ❌ No drip campaign configured');
            return;
        }
        
        try {
            // בדוק אם כבר רשום
            const existingSubscriptions = await base44.asServiceRole.entities.LeadDripSubscription.filter({
                lead_id: lead.id,
                campaign_id: config.drip_campaign_id,
                is_active: true
            });
            
            if (existingSubscriptions.length > 0) {
                console.log('  ℹ️ Already subscribed');
                return;
            }
            
            // רישום
            await base44.asServiceRole.entities.LeadDripSubscription.create({
                lead_id: lead.id,
                campaign_id: config.drip_campaign_id,
                company_id: lead.company_id,
                subscribed_date: new Date().toISOString(),
                last_message_sent: -1,
                is_active: true,
                completed: false
            });
            
            // עדכון מונה
            const campaigns = await base44.asServiceRole.entities.WhatsAppDripCampaign.filter({ 
                id: config.drip_campaign_id 
            });
            if (campaigns.length > 0) {
                await base44.asServiceRole.entities.WhatsAppDripCampaign.update(config.drip_campaign_id, {
                    total_subscribers: (campaigns[0].total_subscribers || 0) + 1
                });
            }
            
            console.log('  ✅ Subscribed successfully');
        } catch (error) {
            console.error('  ❌ Error subscribing:', error);
        }
        
    } else if (module.module_type === 'send_free_whatsapp') {
        console.log('  💬 Sending free WhatsApp message...');
        
        if (!lead.phone) {
            console.log('  ❌ No phone number');
            return;
        }
        
        if (!config?.message_text) {
            console.log('  ❌ No message text in module config');
            return;
        }
        
        // החלף placeholders
        let messageText = config.message_text;
        messageText = messageText.replace(/\{\{lead\.first_name\}\}/g, lead.first_name || '');
        messageText = messageText.replace(/\{\{lead\.last_name\}\}/g, lead.last_name || '');
        messageText = messageText.replace(/\{\{lead\.phone\}\}/g, lead.phone || '');
        messageText = messageText.replace(/\{\{lead\.email\}\}/g, lead.email || '');
        
        console.log('  📞 Sending to:', lead.phone);
        
        // שלח ישירות ל-WhatsApp API
        await sendFreeWhatsAppMessage(base44, lead.phone, messageText, lead.company_id, lead.id);
        
    } else if (module.module_type === 'send_whatsapp') {
        console.log('  📱 Sending WhatsApp template...');
        
        if (!lead.phone) {
            console.log('  ❌ No phone number');
            return;
        }
        
        if (!config?.template_name) {
            console.log('  ❌ No template name in module config');
            return;
        }
        
        console.log('  📞 Sending to:', lead.phone);
        
        const response = await base44.functions.invoke('send-whatsapp-message', {
            phone: lead.phone,
            template_name: config.template_name,
            company_id: lead.company_id,
            lead_id: lead.id,
            lead_data: lead
        });
        
        if (response.data?.success) {
            console.log('  ✅ Template sent successfully');
        } else {
            console.error('  ❌ Failed to send:', response.data);
        }
    }
}

async function sendFreeWhatsAppMessage(base44, phone, messageText, companyId, leadId) {
    try {
        // נרמול מספר טלפון
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.substring(1)}`;

        // טען הגדרות WhatsApp
        let waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: companyId
        });

        // אם אין הגדרות - בדוק חברת אם
        if (waSettings.length === 0 && companyId) {
            const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId });
            if (companies.length > 0 && companies[0].parent_company_id) {
                waSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                    company_id: companies[0].parent_company_id
                });
            }
        }

        if (waSettings.length === 0 || !waSettings[0].access_token) {
            console.log('  ❌ WhatsApp not configured for this company');
            return;
        }

        const settings = waSettings[0];

        // שלח הודעת טקסט חופשית
        const messageBody = {
            messaging_product: 'whatsapp',
            to: phoneWithCountry,
            type: 'text',
            text: {
                body: messageText
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
            console.log('  ✅ Message sent:', waData.messages[0].id);

            // שמור הודעה במסד נתונים
            await base44.asServiceRole.entities.WhatsAppMessage.create({
                message_id: waData.messages[0].id,
                company_id: companyId,
                lead_id: leadId || null,
                phone_number: phoneWithCountry,
                phone_number_id: settings.phone_number_id,
                direction: 'יוצא',
                type: 'text',
                content: messageText,
                status: 'נשלח',
                timestamp: new Date().toISOString(),
                read: false
            });
        } else {
            console.error('  ❌ Failed to send message:', waData);
        }
    } catch (error) {
        console.error('  ❌ Error sending free WhatsApp message:', error);
    }
}