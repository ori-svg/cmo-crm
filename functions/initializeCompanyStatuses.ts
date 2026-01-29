import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    // בדוק אם כבר יש סטטוסים לחברה
    const existingStatuses = await base44.asServiceRole.entities.CompanyLeadStatus.filter({
      company_id: company_id
    });

    if (existingStatuses.length > 0) {
      return Response.json({
        success: true,
        message: 'Statuses already exist',
        statuses: existingStatuses
      });
    }

    // צור את הסטטוסים ברירת המחדל
    const defaultStatuses = [
      {
        company_id: company_id,
        status_name: 'חדש',
        status_type: 'רגיל',
        order: 1,
        color: '#93C5FD',
        is_default: true
      },
      {
        company_id: company_id,
        status_name: 'לא ענה 1',
        status_type: 'רגיל',
        order: 2,
        color: '#FDE68A',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'לא ענה 2',
        status_type: 'רגיל',
        order: 3,
        color: '#BFDBFE',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'תואמה פגישה',
        status_type: 'רגיל',
        order: 4,
        color: '#D9F99D',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'שיחת המשך',
        status_type: 'רגיל',
        order: 5,
        color: '#FBCFE8',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'לא רלוונטי',
        status_type: 'רגיל',
        order: 6,
        color: '#FCA5A5',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'יקר לי',
        status_type: 'רגיל',
        order: 7,
        color: '#FEF08A',
        is_default: false
      },
      {
        company_id: company_id,
        status_name: 'לקוח',
        status_type: 'לקוח',
        order: 8,
        color: '#86EFAC',
        is_default: false
      }
    ];

    const createdStatuses = await base44.asServiceRole.entities.CompanyLeadStatus.bulkCreate(defaultStatuses);

    return Response.json({
      success: true,
      statuses: createdStatuses
    });

  } catch (error) {
    console.error('Error initializing company statuses:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});