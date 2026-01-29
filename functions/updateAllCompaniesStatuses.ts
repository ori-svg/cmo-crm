import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.email !== 'ori@omerdaffan.com') {
      return Response.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    // טען את כל החברות
    const allCompanies = await base44.asServiceRole.entities.Company.list();
    console.log(`Found ${allCompanies.length} companies`);

    const results = [];

    // עבור על כל חברה
    for (const company of allCompanies) {
      try {
        // בדוק אם יש סטטוסים קיימים
        const existingStatuses = await base44.asServiceRole.entities.CompanyLeadStatus.filter({
          company_id: company.id
        });

        console.log(`Company ${company.name}: ${existingStatuses.length} existing statuses`);

        // הגדר את הסטטוסים החדשים
        const defaultStatuses = [
          { status_name: 'חדש', order: 1, color: '#93C5FD', status_type: 'רגיל' },
          { status_name: 'נוצר קשר', order: 2, color: '#FCD34D', status_type: 'רגיל' },
          { status_name: 'מוסמך', order: 3, color: '#C084FC', status_type: 'רגיל' },
          { status_name: 'לקוח', order: 4, color: '#86EFAC', status_type: 'לקוח' },
          { status_name: 'אבוד', order: 5, color: '#FCA5A5', status_type: 'רגיל' },
          { status_name: 'לא ענה 1', order: 6, color: '#FDE68A', status_type: 'רגיל' },
          { status_name: 'לא ענה 2', order: 7, color: '#BFDBFE', status_type: 'רגיל' },
          { status_name: 'לא רלוונטי', order: 8, color: '#FEF08A', status_type: 'רגיל' },
          { status_name: 'נשלחה הצעה', order: 9, color: '#DDD6FE', status_type: 'רגיל' },
          { status_name: 'תואמת שיחת המשך', order: 10, color: '#FBCFE8', status_type: 'רגיל' },
          { status_name: 'תואמת פגישה', order: 11, color: '#D9F99D', status_type: 'רגיל' }
        ];

        // הוסף רק סטטוסים שלא קיימים
        const statusesToAdd = [];
        for (const defaultStatus of defaultStatuses) {
          const exists = existingStatuses.some(s => s.status_name === defaultStatus.status_name);
          if (!exists) {
            statusesToAdd.push({
              company_id: company.id,
              ...defaultStatus,
              is_default: defaultStatus.status_name === 'חדש'
            });
          }
        }

        if (statusesToAdd.length > 0) {
          await base44.asServiceRole.entities.CompanyLeadStatus.bulkCreate(statusesToAdd);
          console.log(`✅ Added ${statusesToAdd.length} statuses to ${company.name}`);
          results.push({
            company_name: company.name,
            company_id: company.id,
            added: statusesToAdd.length,
            status: 'success'
          });
        } else {
          console.log(`ℹ️ ${company.name} already has all default statuses`);
          results.push({
            company_name: company.name,
            company_id: company.id,
            added: 0,
            status: 'already_complete'
          });
        }

      } catch (error) {
        console.error(`Error updating company ${company.name}:`, error);
        results.push({
          company_name: company.name,
          company_id: company.id,
          error: error.message,
          status: 'error'
        });
      }
    }

    return Response.json({
      success: true,
      total_companies: allCompanies.length,
      results: results
    });

  } catch (error) {
    console.error('Error updating all companies statuses:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});