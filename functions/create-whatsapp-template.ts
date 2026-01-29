import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const body = await req.json();
        const { 
            name, 
            language, 
            category, 
            content, 
            header_type, 
            header_content, 
            footer, 
            buttons,
            company_id 
        } = body;

        console.log('📝 Creating WhatsApp template:', name);
        console.log('🏢 Company ID:', company_id);

        // קבל הגדרות WhatsApp
        const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: company_id
        });

        if (settings.length === 0) {
            return Response.json({
                success: false,
                error: 'WhatsApp לא מחובר. אנא חבר את WhatsApp תחילה.'
            }, { status: 400 });
        }

        const whatsappSettings = settings[0];
        const accessToken = whatsappSettings.access_token;
        const businessAccountId = whatsappSettings.business_account_id;

        if (!accessToken || !businessAccountId) {
            return Response.json({
                success: false,
                error: 'חסרים פרטי חיבור WhatsApp'
            }, { status: 400 });
        }

        // בניית רכיבי התבנית
        const components = [];

        // Header
        if (header_type !== 'none' && header_content) {
            const headerComponent = {
                type: 'HEADER',
                format: header_type.toUpperCase()
            };

            if (header_type === 'text') {
                headerComponent.text = header_content;
            } else {
                headerComponent.example = {
                    header_handle: [header_content]
                };
            }

            components.push(headerComponent);
        }

        // Body
        const bodyComponent = {
            type: 'BODY',
            text: content
        };

        // זיהוי משתנים
        const variables = content.match(/\{\{(\d+)\}\}/g);
        if (variables && variables.length > 0) {
            const uniqueVars = [...new Set(variables)].sort();
            bodyComponent.example = {
                body_text: [uniqueVars.map((_, i) => `דוגמה ${i + 1}`)]
            };
        }

        components.push(bodyComponent);

        // Footer
        if (footer) {
            components.push({
                type: 'FOOTER',
                text: footer
            });
        }

        // Buttons
        if (buttons && buttons.length > 0) {
            const validButtons = buttons.filter(btn => btn.text && btn.text.trim());
            
            if (validButtons.length > 0) {
                const buttonComponents = {
                    type: 'BUTTONS',
                    buttons: validButtons.map(btn => {
                        const button = {
                            type: btn.type,
                            text: btn.text
                        };

                        if (btn.type === 'URL' && btn.url) {
                            button.url = btn.url;
                        } else if (btn.type === 'PHONE_NUMBER' && btn.phone) {
                            button.phone_number = btn.phone;
                        }

                        return button;
                    })
                };

                components.push(buttonComponents);
            }
        }

        // שליחה ל-Meta
        const metaUrl = `https://graph.facebook.com/v21.0/${businessAccountId}/message_templates`;
        
        console.log('📤 Sending to Meta:', metaUrl);

        const response = await fetch(metaUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                language: language,
                category: category,
                components: components
            })
        });

        const data = await response.json();

        console.log('📥 Meta response status:', response.status);
        console.log('📥 Meta response:', JSON.stringify(data, null, 2));

        if (!response.ok || data.error) {
            console.error('❌ Meta error:', JSON.stringify(data, null, 2));
            const errorMessage = data.error?.message || data.error?.error_user_msg || 'שגיאה ביצירת התבנית ב-Meta';
            const errorDetails = data.error?.error_user_title || '';
            return Response.json({
                success: false,
                error: `${errorMessage}${errorDetails ? ' - ' + errorDetails : ''}`,
                details: data.error
            }, { status: 400 });
        }

        // שמור ב-DB
        const templateData = {
            company_id: company_id,
            name: name,
            language: language,
            category: category,
            content: content,
            header_type: header_type,
            header_content: header_content,
            footer: footer,
            buttons: buttons,
            status: 'ממתין לאישור',
            meta_id: data.id
        };

        console.log('💾 Saving to DB:', templateData);

        await base44.asServiceRole.entities.WhatsAppTemplate.create(templateData);

        console.log('✅ Template created successfully');

        return Response.json({
            success: true,
            template_id: data.id,
            message: 'התבנית נשלחה בהצלחה לאישור Meta'
        });

    } catch (error) {
        console.error('❌ Error creating template:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});