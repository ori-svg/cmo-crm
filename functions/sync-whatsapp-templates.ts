import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

        const body = await req.json().catch(() => ({}));
        const company_id = body.company_id || user.company_id;

        if (!company_id) {
            return Response.json({ 
                success: false,
                error: 'חסר מזהה חברה' 
            }, { status: 400 });
        }

        console.log('🔄 Syncing templates for company:', company_id);

        // טען הגדרות WhatsApp - אם לא קיימות, נסה לטעון מחברת האם
        let settings = await base44.entities.WhatsAppSettings.filter({ 
            company_id: company_id 
        });

        if (settings.length === 0) {
            console.log('⚠️ No direct WhatsApp settings - checking parent company...');
            
            // בדוק אם יש חברת אם
            const companies = await base44.entities.Company.filter({ id: company_id });
            if (companies.length > 0 && companies[0].parent_company_id) {
                const parentCompanyId = companies[0].parent_company_id;
                console.log('🔄 Loading settings from parent company:', parentCompanyId);
                
                settings = await base44.entities.WhatsAppSettings.filter({ 
                    company_id: parentCompanyId 
                });
                
                if (settings.length === 0) {
                    console.log('❌ No WhatsApp settings found in parent company either');
                    return Response.json({ 
                        success: false,
                        error: 'WhatsApp לא מחובר. אנא התחבר תחילה בעמוד ההגדרות.' 
                    }, { status: 400 });
                }
                
                console.log('✅ Using inherited settings from parent company');
            } else {
                console.log('❌ No WhatsApp settings found and no parent company');
                return Response.json({ 
                    success: false,
                    error: 'WhatsApp לא מחובר. אנא התחבר תחילה בעמוד ההגדרות.' 
                }, { status: 400 });
            }
        }

        const settingsData = settings[0];
        const business_account_id = settingsData.business_account_id;
        const access_token = settingsData.access_token;

        if (!business_account_id || !access_token) {
            console.log('❌ Missing WABA ID or Access Token');
            return Response.json({ 
                success: false,
                error: 'חסרים פרטי חיבור. אנא התחבר מחדש ל-WhatsApp בהגדרות.' 
            }, { status: 400 });
        }

        console.log('📝 Fetching templates from Meta...');
        console.log('WABA ID:', business_account_id);

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${business_account_id}/message_templates?limit=100`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Meta API Error:', response.status, errorText);
            
            let errorMessage = 'שגיאה בחיבור ל-Meta';
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage = errorData.error.message;
                    
                    if (errorMessage.includes('token')) {
                        errorMessage = 'Token לא תקין. אנא התחבר מחדש ל-WhatsApp בהגדרות.';
                    } else if (errorMessage.includes('permission')) {
                        errorMessage = 'אין הרשאות. ודא שיש לך הרשאות לניהול תבניות.';
                    }
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            
            return Response.json({ 
                success: false, 
                error: errorMessage,
                details: errorText
            }, { status: response.status });
        }

        const result = await response.json();
        const templates = result.data || [];
        
        console.log(`📝 Found ${templates.length} templates`);

        let synced = 0;
        const errors = [];

        for (const template of templates) {
            try {
                const templateLang = template.language || 'he';
                const templateCategory = template.category || 'MARKETING';
                const templateStatus = template.status === 'APPROVED' ? 'מאושר' : 
                                     template.status === 'PENDING' ? 'ממתין לאישור' : 
                                     'נדחה';
                
                const templateData = {
                    name: template.name,
                    language: templateLang,
                    category: templateCategory,
                    status: templateStatus,
                    meta_id: template.id,
                    company_id: company_id
                };

                let content = '';
                let variables = [];
                let header_type = 'none';
                let header_content = '';
                let footer = '';
                let buttons = [];

                if (template.components) {
                    for (const component of template.components) {
                        if (component.type === 'HEADER') {
                            const headerFormat = component.format;
                            header_type = headerFormat ? headerFormat.toLowerCase() : 'text';
                            header_content = component.text || '';
                        } else if (component.type === 'BODY') {
                            content = component.text || '';
                            
                            const matches = content.match(/\{\{(\d+)\}\}/g);
                            if (matches) {
                                variables = matches.map((m, i) => `{{${i + 1}}}`);
                            }
                        } else if (component.type === 'FOOTER') {
                            footer = component.text || '';
                        } else if (component.type === 'BUTTONS') {
                            buttons = component.buttons || [];
                        }
                    }
                }

                templateData.content = content;
                templateData.variables = variables;
                templateData.header_type = header_type;
                templateData.header_content = header_content;
                templateData.footer = footer;
                templateData.buttons = buttons;

                const existing = await base44.asServiceRole.entities.WhatsAppTemplate.filter({
                    name: template.name,
                    company_id: company_id
                });

                if (existing.length > 0) {
                    await base44.asServiceRole.entities.WhatsAppTemplate.update(
                        existing[0].id,
                        templateData
                    );
                    console.log(`✅ Updated template "${template.name}" for company ${company_id}`);
                } else {
                    await base44.asServiceRole.entities.WhatsAppTemplate.create(templateData);
                    console.log(`✅ Created template "${template.name}" for company ${company_id}`);
                }

                synced++;
            } catch (error) {
                console.error('Error syncing template:', template.name, error);
                errors.push({
                    template: template.name,
                    error: error.message
                });
            }
        }

        console.log(`✅ Synced ${synced}/${templates.length} templates`);

        return Response.json({
            success: true,
            synced: synced,
            total: templates.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('❌ Sync error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'שגיאה לא ידועה'
        }, { status: 500 });
    }
});