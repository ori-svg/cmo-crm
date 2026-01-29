import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.email !== SUPER_ADMIN_EMAIL) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { 
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

        // Create company
        const newCompany = await base44.asServiceRole.entities.Company.create({
            name,
            slug: slug || null,
            logo_url: logo_url || null,
            primary_color: primary_color || "#1e40af",
            secondary_color: secondary_color || "#10b981",
            accent_color: accent_color || "#f59e0b",
            parent_company_id: parent_company_id || null,
            company_admin_user_id: company_admin_user_id || null,
            is_parent_company: is_parent_company || false,
            notification_email: notification_email || null,
            status: "פעילה"
        });

        console.log('✅ Company created:', newCompany.id);

        // אם יש מנהל - עדכן את המשתמש ויצור CompanyUser record
        if (company_admin_user_id) {
            console.log('📝 Setting admin for company:', company_admin_user_id);
            
            // Update user to be admin of this company
            await base44.asServiceRole.entities.User.update(company_admin_user_id, {
                company_id: newCompany.id,
                user_role: 'company_admin'
            });

            // Create CompanyUser record
            await base44.asServiceRole.entities.CompanyUser.create({
                user_id: company_admin_user_id,
                company_id: newCompany.id,
                role: 'company_admin',
                status: 'פעיל'
            });
            
            console.log('✅ Admin assigned successfully');
        }

        // אם זו חברת בת - צור CompanyUser record למנהל חברת האם
        if (parent_company_id) {
            console.log('🏢 This is a sub-company, finding parent admin...');
            
            // מצא את חברת האם
            const parentCompanies = await base44.asServiceRole.entities.Company.filter({ id: parent_company_id });
            if (parentCompanies.length > 0) {
                const parentCompany = parentCompanies[0];
                console.log('📋 Parent company found:', parentCompany.name);
                
                if (parentCompany.company_admin_user_id) {
                    console.log('👤 Parent admin:', parentCompany.company_admin_user_id);
                    
                    // בדוק אם כבר יש CompanyUser record
                    const existingRecords = await base44.asServiceRole.entities.CompanyUser.filter({
                        user_id: parentCompany.company_admin_user_id,
                        company_id: newCompany.id
                    });

                    if (existingRecords.length === 0) {
                        // צור CompanyUser record למנהל חברת האם
                        await base44.asServiceRole.entities.CompanyUser.create({
                            user_id: parentCompany.company_admin_user_id,
                            company_id: newCompany.id,
                            role: 'company_admin',
                            status: 'פעיל'
                        });
                        console.log('✅ Parent admin linked to sub-company');
                    } else {
                        console.log('ℹ️ Parent admin already linked');
                    }
                } else {
                    console.log('⚠️ Parent company has no admin');
                }
            }
        }
        
        return Response.json({ 
            success: true,
            company: newCompany
        });

    } catch (error) {
        console.error('Error creating company:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});