import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const DEFAULT_VERIFY_TOKEN = 'cmo_crm_whatsapp_2024_secure_token';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    
    console.log('🔔 ========================================');
    console.log('🔔 Webhook called:', req.method, url.pathname);
    console.log('🔔 Time:', new Date().toISOString());
    console.log('🔔 ========================================');
    
    // Webhook Verification (GET request from Meta)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        console.log('🔐 Verification request');
        console.log('   Mode:', mode);
        console.log('   Token:', token);
        console.log('   Challenge:', challenge);

        if (mode === 'subscribe' && token === DEFAULT_VERIFY_TOKEN) {
            console.log('✅ Webhook verified successfully!');
            return new Response(challenge, { 
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        } else {
            console.error('❌ Verification failed - wrong token or mode');
            return new Response('Forbidden', { status: 403 });
        }
    }

    // Handle incoming messages (POST)
    if (req.method === 'POST') {
        try {
            const base44 = createClientFromRequest(req);
            const body = await req.json();
            
            console.log('📩 ========================================');
            console.log('📩 RAW WEBHOOK DATA:');
            console.log(JSON.stringify(body, null, 2));
            console.log('📩 ========================================');

            if (body.object === 'whatsapp_business_account') {
                console.log('✅ Valid WhatsApp webhook object');
                
                for (const entry of body.entry || []) {
                    console.log('📦 Processing entry:', entry.id);
                    
                    for (const change of entry.changes || []) {
                        console.log('🔄 Change field:', change.field);
                        
                        if (change.field === 'messages') {
                            const value = change.value;
                            const phoneNumberId = value.metadata?.phone_number_id;
                            
                            console.log('📱 Phone Number ID:', phoneNumberId);
                            console.log('📱 Display Phone:', value.metadata?.display_phone_number);
                            
                            // מצא את ה-company_id לפי phone_number_id
                            console.log('🔍 Searching for WhatsApp settings...');
                            console.log('🔍 Looking for phone_number_id:', phoneNumberId);
                            
                            const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                                phone_number_id: phoneNumberId
                            });
                            
                            console.log('🔍 Found settings:', settings.length);
                            
                            if (settings.length === 0) {
                                console.error('❌ No WhatsApp settings found for phone_number_id:', phoneNumberId);
                                continue;
                            }
                            
                            // מזהה החברה שההגדרות רשומות עליה (חברת אם)
                            const ownerCompanyId = settings[0].company_id;
                            console.log('🏢 WhatsApp Owner Company ID:', ownerCompanyId);
                            
                            // טען את כל החברות שמשתמשות בהגדרות האלו (חברת האם + חברות בת)
                            const allCompanies = await base44.asServiceRole.entities.Company.list();
                            const relevantCompanies = [ownerCompanyId];
                            
                            // הוסף חברות בת שההורה שלהן הוא חברת האם
                            allCompanies.forEach(company => {
                                if (company.parent_company_id === ownerCompanyId) {
                                    // בדוק שלחברת הבת אין הגדרות WhatsApp משלה
                                    const hasOwnSettings = false; // נבדק בהמשך
                                    relevantCompanies.push(company.id);
                                    console.log('📎 Found subsidiary company:', company.id, company.name);
                                }
                            });
                            
                            console.log('📋 Total companies using this WhatsApp:', relevantCompanies.length);
                            
                            // Process incoming messages - צריך לסווג לאיזו חברה השייכת ההודעה
                            if (value.messages && value.messages.length > 0) {
                                console.log('📨 Processing', value.messages.length, 'incoming messages');
                                for (const message of value.messages) {
                                    await processIncomingMessage(base44, message, value.metadata, relevantCompanies);
                                }
                            } else {
                                console.log('ℹ️ No messages in this webhook');
                            }

                            // Process status updates - עדכן סטטוס בכל החברות הרלוונטיות
                            if (value.statuses && value.statuses.length > 0) {
                                console.log('📊 Processing', value.statuses.length, 'status updates');
                                for (const status of value.statuses) {
                                    // עבור על כל החברות ועדכן סטטוס
                                    for (const companyId of relevantCompanies) {
                                        await processMessageStatus(base44, status, companyId);
                                    }
                                }
                            } else {
                                console.log('ℹ️ No status updates in this webhook');
                            }
                        } else {
                            console.log('ℹ️ Ignoring field:', change.field);
                        }
                    }
                }
            } else {
                console.log('⚠️ Not a whatsapp_business_account webhook, object:', body.object);
            }

            console.log('✅ Webhook processing completed');
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('💥 ========================================');
            console.error('💥 ERROR IN WEBHOOK:');
            console.error('💥 Message:', error.message);
            console.error('💥 Stack:', error.stack);
            console.error('💥 ========================================');
            
            return new Response(JSON.stringify({ error: error.message }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    console.log('❌ Method not allowed:', req.method);
    return new Response('Method not allowed', { status: 405 });
});

async function processIncomingMessage(base44, message, metadata, relevantCompanies) {
    try {
        console.log('📨 ========================================');
        console.log('📨 Processing message:', message.id);
        console.log('   From:', message.from);
        console.log('   Type:', message.type);
        console.log('   Relevant companies:', relevantCompanies.length);
        
        const phoneNumber = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();
        const phoneNumberId = metadata.phone_number_id;

        let content = '';
        let type = 'text';
        let mediaUrl = null;
        let quickReplyId = null;
        let listReplyId = null;

        if (message.type === 'text') {
            content = message.text.body;
            console.log('   Content:', content);
        } else if (message.type === 'image') {
            content = message.image.caption || 'תמונה';
            type = 'image';
            mediaUrl = message.image.id;
            console.log('   Image ID:', mediaUrl);
        } else if (message.type === 'video') {
            content = message.video.caption || 'וידאו';
            type = 'video';
            mediaUrl = message.video.id;
            console.log('   Video ID:', mediaUrl);
        } else if (message.type === 'document') {
            content = message.document.filename || 'מסמך';
            type = 'document';
            mediaUrl = message.document.id;
            console.log('   Document ID:', mediaUrl);
        } else if (message.type === 'audio') {
            content = 'הודעת קול';
            type = 'audio';
            mediaUrl = message.audio.id;
            console.log('   Audio ID:', mediaUrl);
        } else if (message.type === 'button') {
            // כפתור תגובה מהירה
            content = message.button.text || message.button.payload;
            type = 'quick_reply';
            quickReplyId = message.button.payload;
            console.log('   Button Reply Text:', content);
            console.log('   Button Reply Payload:', quickReplyId);
        } else if (message.type === 'interactive') {
            console.log('   Interactive message detected:', message.interactive.type);
            if (message.interactive.type === 'button_reply') {
                content = message.interactive.button_reply.title;
                type = 'quick_reply';
                quickReplyId = message.interactive.button_reply.id;
                console.log('   Quick Reply Title:', content);
                console.log('   Quick Reply ID:', quickReplyId);
            } else if (message.interactive.type === 'list_reply') {
                content = message.interactive.list_reply.title;
                type = 'list_reply';
                listReplyId = message.interactive.list_reply.id;
                console.log('   List Reply Title:', content);
                console.log('   List Reply ID:', listReplyId);
            }
        }

        // חפש ליד תואם בכל החברות הרלוונטיות
        console.log('🔍 Searching for matching lead across companies...');
        
        // נרמול מספר הטלפון הנכנס
        const normalizedIncomingPhone = phoneNumber.replace(/\D/g, '');
        const normalizedWithout972 = normalizedIncomingPhone.startsWith('972') 
            ? normalizedIncomingPhone.substring(3) 
            : normalizedIncomingPhone;
        const normalizedWithoutLeadingZero = normalizedWithout972.startsWith('0')
            ? normalizedWithout972.substring(1)
            : normalizedWithout972;
        
        console.log('   Original phone:', phoneNumber);
        console.log('   Normalized:', normalizedIncomingPhone);
        console.log('   Without 972:', normalizedWithout972);
        console.log('   Without leading 0:', normalizedWithoutLeadingZero);
        
        let matchingLead = null;
        let targetCompanyId = relevantCompanies[0]; // ברירת מחדל - החברה הראשונה (חברת האם)
        
        // חפש ליד בכל החברות הרלוונטיות
        for (const companyId of relevantCompanies) {
            const leads = await base44.asServiceRole.entities.Lead.filter({
                company_id: companyId
            });
            console.log('   🔍 Company', companyId, '- Found', leads.length, 'leads');
            
            const foundLead = leads.find(l => {
                if (!l.phone) return false;
                
                // נרמול מספר הליד
                const leadPhone = l.phone.replace(/\D/g, '');
                const leadWithout972 = leadPhone.startsWith('972') ? leadPhone.substring(3) : leadPhone;
                const leadWithoutLeadingZero = leadWithout972.startsWith('0') ? leadWithout972.substring(1) : leadWithout972;
                
                // השווה את שני המספרים מנורמלים
                return normalizedWithoutLeadingZero === leadWithoutLeadingZero;
            });
            
            if (foundLead) {
                matchingLead = foundLead;
                targetCompanyId = companyId;
                console.log('✅ Found matching lead in company:', companyId);
                console.log('   Lead:', matchingLead.id, matchingLead.first_name, matchingLead.last_name);
                console.log('   Lead phone:', matchingLead.phone);
                break;
            }
        }
        
        if (!matchingLead) {
            console.log('ℹ️ No matching lead found in any company');
        }

        // שמור הודעה בחברה המתאימה
        console.log('💾 Saving message to company:', targetCompanyId);
        const messageData = {
            message_id: messageId,
            company_id: targetCompanyId,
            lead_id: matchingLead?.id || null,
            phone_number: phoneNumber,
            phone_number_id: phoneNumberId,
            direction: 'נכנס',
            type: type,
            content: content,
            media_url: mediaUrl,
            status: 'נמסר',
            timestamp: timestamp,
            read: false,
            quick_reply_id: quickReplyId,
            list_reply_id: listReplyId
        };
        
        console.log('   Message data:', JSON.stringify(messageData, null, 2));
        
        const savedMessage = await base44.asServiceRole.entities.WhatsAppMessage.create(messageData);

        console.log('✅ Message saved successfully!');
        console.log('   Saved ID:', savedMessage.id);
        console.log('   Timestamp:', savedMessage.timestamp);
        console.log('📨 ========================================');

        // בדיקה אם ההודעה היא בקשה להסרה
        if (matchingLead && content && (content.toLowerCase().includes('הסר') || content.toLowerCase().includes('stop'))) {
            console.log('🚫 Unsubscribe request detected - adding "הסר" tag');
            try {
                const currentTags = matchingLead.tags || [];
                if (!currentTags.includes('הסר')) {
                    await base44.asServiceRole.entities.Lead.update(matchingLead.id, {
                        tags: [...currentTags, 'הסר']
                    });
                    console.log('✅ Added "הסר" tag to lead:', matchingLead.id);
                } else {
                    console.log('ℹ️ Lead already has "הסר" tag');
                }
            } catch (error) {
                console.error('❌ Error adding "הסר" tag:', error);
            }
        }

        // צור ליד חדש אם לא נמצא
        if (!matchingLead) {
            console.log('➕ Creating new lead from WhatsApp message...');
            const newLead = await base44.asServiceRole.entities.Lead.create({
                first_name: phoneNumber,
                last_name: '',
                phone: phoneNumber,
                email: `${phoneNumber}@whatsapp.temp`,
                source: 'WhatsApp',
                status: 'חדש',
                company_id: targetCompanyId,
                notes: `ליד נוצר מהודעת WhatsApp ב-${new Date().toLocaleString('he-IL')}`
            });

            await base44.asServiceRole.entities.WhatsAppMessage.update(savedMessage.id, {
                lead_id: newLead.id
            });

            matchingLead = newLead;
            console.log('✅ New lead created:', newLead.id);
        }

        // הפעל אוטומציות על הודעות WhatsApp נכנסות
        try {
            console.log('🔄 Calling run-automations function...');
            const automationResponse = await base44.functions.invoke('run-automations', {
                trigger_type: 'התקבלה הודעת WhatsApp',
                event_data: {
                    lead: matchingLead,
                    message: {
                        content: content,
                        type: type,
                        quick_reply_id: quickReplyId,
                        list_reply_id: listReplyId
                    },
                    company_id: targetCompanyId
                }
            });
            console.log('✅ Automations response:', JSON.stringify(automationResponse.data, null, 2));
        } catch (error) {
            console.error('❌ Error running automations:', error);
            console.error('   Stack:', error.stack);
        }

    } catch (error) {
        console.error('❌ ========================================');
        console.error('❌ Error processing message:', message.id);
        console.error('   Error:', error.message);
        console.error('   Stack:', error.stack);
        console.error('❌ ========================================');
    }
}

async function processMessageStatus(base44, status, companyId) {
    try {
        console.log('📊 Processing status update:', status.id);
        
        const messageId = status.id;
        const statusValue = status.status;
        console.log('   Status:', statusValue);

        let statusInHebrew = 'נשלח';
        if (statusValue === 'delivered') statusInHebrew = 'נמסר';
        else if (statusValue === 'read') statusInHebrew = 'נקרא';
        else if (statusValue === 'failed') statusInHebrew = 'נכשל';

        // מצא הודעה לפי message_id ו-company_id
        const messages = await base44.asServiceRole.entities.WhatsAppMessage.filter({
            message_id: messageId,
            company_id: companyId
        });

        if (messages.length > 0) {
            await base44.asServiceRole.entities.WhatsAppMessage.update(messages[0].id, {
                status: statusInHebrew,
                read: statusValue === 'read'
            });
            console.log('✅ Status updated:', messageId, '->', statusInHebrew);
        } else {
            console.log('⚠️ Message not found for status update:', messageId);
        }
    } catch (error) {
        console.error('❌ Error updating status:', error.message);
    }
}