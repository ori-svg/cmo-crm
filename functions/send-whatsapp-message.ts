import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function normalizeIsraeliPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone, phone_number, template_name, company_id, lead_id, lead_data, message, media_url, media_type, caption } = await req.json();
        
        const actualPhone = phone || phone_number;

        if (!actualPhone || !company_id) {
            return Response.json({ error: 'Missing phone or company_id' }, { status: 400 });
        }

        console.log('📤 Sending WhatsApp message to:', actualPhone, 'for company:', company_id);
        if (media_url) {
            console.log('📎 With media:', media_type, media_url);
        }

        // טען הגדרות WhatsApp - של החברה או חברת האם
        let settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: company_id
        });
        
        // אם אין הגדרות - בדוק אם זו חברת בת עם חברת אם שיש לה הגדרות
        if (settings.length === 0) {
            const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
            
            if (companies.length > 0 && companies[0].parent_company_id) {
                console.log('🔍 Checking parent company WhatsApp settings:', companies[0].parent_company_id);
                settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                    company_id: companies[0].parent_company_id
                });
                
                if (settings.length > 0) {
                    console.log('✅ Using parent company WhatsApp settings');
                }
            }
        }
        
        if (settings.length === 0) {
            return Response.json({ error: 'WhatsApp not connected for this company or parent company' }, { status: 400 });
        }

        const { phone_number_id: pnId, access_token } = settings[0];

        // Clean phone number
        const cleanPhone = actualPhone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.substring(1)}`;

        let messageBody;
        
        // אם יש תבנית - שלח דרך template
        if (template_name) {
            console.log('📋 Using template:', template_name);
            
            const templates = await base44.asServiceRole.entities.WhatsAppTemplate.filter({
                name: template_name,
                company_id: company_id
            });
            
            if (templates.length === 0) {
                return Response.json({ error: `Template ${template_name} not found` }, { status: 400 });
            }
            
            const template = templates[0];
            
            // בנה את הקומפוננטות (כותרת, גוף, כפתורים) עבור התבנית
            const templateComponents = [];
            
            // הוסף קומפוננטת HEADER רק אם יש header_content (כלומר - פרמטר דינמי)
            // אם ה-header_content ריק, זה אומר שהמדיה סטטית והוגדרה במטא
            if (template.header_type && template.header_content) {
                if (template.header_type === 'text' && template.header_content.includes('{{1}}')) {
                    // טקסט דינמי - שלח את הערך מה-lead_data
                    const headerValue = lead_data?.[template.variables_mapping?.['0']] || template.header_content;
                    templateComponents.push({
                        type: 'header',
                        parameters: [{
                            type: 'text',
                            text: headerValue
                        }]
                    });
                } else if (template.header_type === 'image' && template.header_content.startsWith('http')) {
                    templateComponents.push({
                        type: 'header',
                        parameters: [{
                            type: 'image',
                            image: { link: template.header_content }
                        }]
                    });
                } else if (template.header_type === 'video' && template.header_content.startsWith('http')) {
                    templateComponents.push({
                        type: 'header',
                        parameters: [{
                            type: 'video',
                            video: { link: template.header_content }
                        }]
                    });
                } else if (template.header_type === 'document' && template.header_content.startsWith('http')) {
                    templateComponents.push({
                        type: 'header',
                        parameters: [{
                            type: 'document',
                            document: { link: template.header_content }
                        }]
                    });
                }
                // אם header_type קיים אבל header_content לא מתאים לתנאים למעלה,
                // לא נשלח parameters - כנראה שהמדיה סטטית במטא
            }
            
            // הוסף body parameters רק אם יש מיפוי משתנים מוגדר
            if (template.variables_mapping && Object.keys(template.variables_mapping).length > 0) {
                const parameters = Object.entries(template.variables_mapping).map(([varIndex, fieldName]) => {
                    const value = lead_data?.[fieldName] || '-';
                    return { type: 'text', text: String(value) };
                });

                templateComponents.push({
                    type: 'body',
                    parameters: parameters
                });
            }
            
            // בנה את messageBody
            messageBody = {
                messaging_product: 'whatsapp',
                to: phoneWithCountry,
                type: 'template',
                template: {
                    name: template_name,
                    language: {
                        code: template.language || 'he'
                    }
                }
            };
            
            // הוסף components רק אם יש
            if (templateComponents.length > 0) {
                messageBody.template.components = templateComponents;
            }
            
            console.log('📤 Sending template message:');
            console.log('   Template name:', template_name);
            console.log('   Has variables_mapping?', template.variables_mapping ? 'YES' : 'NO');
            console.log('   variables_mapping:', JSON.stringify(template.variables_mapping));
            console.log('   Full message body:', JSON.stringify(messageBody, null, 2));
        } else if (media_url) {
            // הודעת מדיה (תמונה, וידאו, מסמך)
            console.log('📎 Sending media message:', media_type);
            
            messageBody = {
                messaging_product: 'whatsapp',
                to: phoneWithCountry,
                type: media_type
            };
            
            // הוסף את המדיה לפי הסוג
            if (media_type === 'image') {
                messageBody.image = {
                    link: media_url
                };
                if (caption) {
                    messageBody.image.caption = caption;
                }
            } else if (media_type === 'video') {
                messageBody.video = {
                    link: media_url
                };
                if (caption) {
                    messageBody.video.caption = caption;
                }
            } else if (media_type === 'document') {
                messageBody.document = {
                    link: media_url
                };
                if (caption) {
                    messageBody.document.caption = caption;
                }
            }
        } else {
            // הודעת טקסט רגילה
            messageBody = {
                messaging_product: 'whatsapp',
                to: phoneWithCountry,
                type: 'text',
                text: {
                    body: message || 'הודעה מהמערכת'
                }
            };
        }

        // Send message via WhatsApp API
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${pnId}/messages`,
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

        if (result.error) {
            console.error('❌ WhatsApp API Error:', result.error);
            return Response.json({ 
                success: false, 
                error: result.error.message 
            });
        }

        console.log('✅ Message sent successfully:', result.messages[0].id);

        // שמור למאגר עם company_id
        const messageRecord = {
            message_id: result.messages[0].id,
            phone_number: phoneWithCountry,
            phone_number_id: pnId,
            company_id: company_id,
            direction: 'יוצא',
            type: media_url ? media_type : (template_name ? 'template' : 'text'),
            content: media_url ? (caption || 'קובץ') : (template_name ? `Template: ${template_name}` : message),
            media_url: media_url || null,
            template_name: template_name || null,
            status: 'נשלח',
            timestamp: new Date().toISOString(),
            read: false
        };

        // אם נשלח lead_id ישירות - השתמש בו
        if (lead_id) {
            messageRecord.lead_id = lead_id;
        } else {
            // חפש ליד/לקוח קשור בתוך החברה
            const leads = await base44.asServiceRole.entities.Lead.filter({ 
                company_id: company_id 
            });
            
            const normalizedPhone = normalizeIsraeliPhone(phoneWithCountry);
            
            const matchingLead = leads.find(l => {
                if (!l.phone) return false;
                const normalizedLeadPhone = normalizeIsraeliPhone(l.phone);
                return normalizedLeadPhone === normalizedPhone;
            });

            if (matchingLead) {
                messageRecord.lead_id = matchingLead.id;
            } else {
                const clients = await base44.asServiceRole.entities.Client.filter({ 
                    company_id: company_id 
                });
                const matchingClient = clients.find(c => {
                    if (!c.phone) return false;
                    const normalizedClientPhone = normalizeIsraeliPhone(c.phone);
                    return normalizedClientPhone === normalizedPhone;
                });
                if (matchingClient) {
                    messageRecord.client_id = matchingClient.id;
                }
            }
        }

        await base44.asServiceRole.entities.WhatsAppMessage.create(messageRecord);

        return Response.json({ 
            success: true, 
            message_id: result.messages[0].id 
        });

    } catch (error) {
        console.error('💥 Error sending message:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});