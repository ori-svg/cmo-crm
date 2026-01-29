import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !SUPER_ADMIN_EMAILS.includes(user.email)) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { 
            company_id,
            name, 
            slug,
            logo_url, 
            primary_color, 
            secondary_color, 
            accent_color, 
            parent_company_id, 
            company_admin_user_id,
            is_parent_company,
            notification_email
        } = await req.json();

        if (!company_id) {
            return Response.json({ 
                success: false,
                error: 'Missing required field: company_id' 
            }, { status: 400 });
        }

        if (!name) {
            return Response.json({ 
                success: false,
                error: 'Missing required field: name' 
            }, { status: 400 });
        }

        // אם יש חברת אם - לא צריך מנהל
        // אם אין חברת אם - חייב מנהל
        if (!parent_company_id && !company_admin_user_id) {
            return Response.json({ 
                success: false,
                error: 'Missing required field: company_admin_user_id (required for companies without parent)' 
            }, { status: 400 });
        }

        // בדוק אם חברת אם לא יכולה להיות חברת בת
        if (is_parent_company && parent_company_id) {
            return Response.json({ 
                success: false,
                error: 'חברת אם לא יכולה להיות חברת בת של חברה אחרת' 
            }, { status: 400 });
        }

        // עדכן חברה
        const updatedCompany = await base44.asServiceRole.entities.Company.update(company_id, {
            name,
            slug: slug || null,
            logo_url: logo_url || null,
            primary_color: primary_color || "#1e40af",
            secondary_color: secondary_color || "#10b981",
            accent_color: accent_color || "#f59e0b",
            parent_company_id: parent_company_id || null,
            company_admin_user_id: company_admin_user_id || null,
            is_parent_company: is_parent_company || false,
            notification_email: notification_email || null
        });

        console.log('✅ Company updated:', company_id);

        // אם יש מנהל חדש - עדכן
        if (company_admin_user_id) {
            console.log('📝 Setting/updating admin for company:', company_admin_user_id);
            
            // Update user to be admin of this company
            await base44.asServiceRole.entities.User.update(company_admin_user_id, {
                company_id: company_id,
                user_role: 'company_admin'
            });

            // בדוק אם יש CompanyUser record
            const existingRecords = await base44.asServiceRole.entities.CompanyUser.filter({
                user_id: company_admin_user_id,
                company_id: company_id
            });

            if (existingRecords.length === 0) {
                // Create CompanyUser record
                await base44.asServiceRole.entities.CompanyUser.create({
                    user_id: company_admin_user_id,
                    company_id: company_id,
                    role: 'company_admin',
                    status: 'פעיל'
                });
            }
            
            console.log('✅ Admin assigned successfully');
        }

        // אם זו חברת בת - וודא שמנהל חברת האם מחובר
        if (parent_company_id) {
            console.log('🏢 This is a sub-company, checking parent admin...');
            
            const parentCompanies = await base44.asServiceRole.entities.Company.filter({ id: parent_company_id });
            if (parentCompanies.length > 0) {
                const parentCompany = parentCompanies[0];
                console.log('📋 Parent company found:', parentCompany.name);
                
                if (parentCompany.company_admin_user_id) {
                    console.log('👤 Parent admin:', parentCompany.company_admin_user_id);
                    
                    const existingRecords = await base44.asServiceRole.entities.CompanyUser.filter({
                        user_id: parentCompany.company_admin_user_id,
                        company_id: company_id
                    });

                    if (existingRecords.length === 0) {
                        await base44.asServiceRole.entities.CompanyUser.create({
                            user_id: parentCompany.company_admin_user_id,
                            company_id: company_id,
                            role: 'company_admin',
                            status: 'פעיל'
                        });
                        console.log('✅ Parent admin linked to sub-company');
                    }
                }
            }
        }
        
        return Response.json({ 
            success: true,
            company: updatedCompany
        });

    } catch (error) {
        console.error('Error updating company:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});