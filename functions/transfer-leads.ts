import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

// שדות מערכת שלא מעתיקים לרשומה חדשה
const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'is_sample'];

const stripSystemFields = (record) => {
    const copy = { ...record };
    SYSTEM_FIELDS.forEach(field => delete copy[field]);
    return copy;
};

// מחזיר את רשימת המשתמשים ששייכים לחברה (דרך User.company_id או CompanyUser)
const getCompanyUsers = async (base44, companyId, allUsers) => {
    const memberships = await base44.asServiceRole.entities.CompanyUser.filter({ company_id: companyId });
    const memberIds = new Set(memberships.map(m => m.user_id));
    return allUsers.filter(u => u.company_id === companyId || memberIds.has(u.id));
};

// וודא שהסטטוס של הליד קיים בחברת היעד - אם לא, העתק אותו מחברת המקור
const ensureStatusInCompany = async (base44, statusName, sourceCompanyId, targetCompanyId, cache) => {
    if (!statusName) return;

    if (!cache.has(targetCompanyId)) {
        const existing = await base44.asServiceRole.entities.CompanyLeadStatus.filter({ company_id: targetCompanyId });
        cache.set(targetCompanyId, existing);
    }
    const targetStatuses = cache.get(targetCompanyId);
    if (targetStatuses.some(s => s.status_name === statusName)) return;

    let template = null;
    if (sourceCompanyId) {
        const sourceStatuses = await base44.asServiceRole.entities.CompanyLeadStatus.filter({
            company_id: sourceCompanyId,
            status_name: statusName
        });
        template = sourceStatuses[0] || null;
    }

    const maxOrder = targetStatuses.reduce((max, s) => Math.max(max, s.order || 0), 0);
    const created = await base44.asServiceRole.entities.CompanyLeadStatus.create({
        company_id: targetCompanyId,
        status_name: statusName,
        status_type: template?.status_type || 'רגיל',
        order: maxOrder + 1,
        color: template?.color || '#D1D5DB',
        is_default: false
    });
    targetStatuses.push(created);
    console.log(`➕ Status "${statusName}" added to company ${targetCompanyId}`);
};

// כל הרשומות שמקושרות לליד
const getRelatedRecords = async (base44, leadId) => {
    const entities = base44.asServiceRole.entities;
    const [meetings, quotes, messages, dripSubscriptions, clients] = await Promise.all([
        entities.CalendarEvent.filter({ related_lead_id: leadId }),
        entities.Quote.filter({ lead_id: leadId }),
        entities.WhatsAppMessage.filter({ lead_id: leadId }),
        entities.LeadDripSubscription.filter({ lead_id: leadId }),
        entities.Client.filter({ origin_lead_id: leadId })
    ]);
    return { meetings, quotes, messages, dripSubscriptions, clients };
};

const moveLead = async (base44, lead, targetCompanyId, leadUpdates) => {
    const entities = base44.asServiceRole.entities;
    const related = await getRelatedRecords(base44, lead.id);

    await entities.Lead.update(lead.id, { ...leadUpdates, company_id: targetCompanyId });

    for (const meeting of related.meetings) {
        await entities.CalendarEvent.update(meeting.id, { company_id: targetCompanyId });
    }
    for (const quote of related.quotes) {
        await entities.Quote.update(quote.id, { company_id: targetCompanyId });
    }
    for (const message of related.messages) {
        await entities.WhatsAppMessage.update(message.id, { company_id: targetCompanyId });
    }
    for (const client of related.clients) {
        await entities.Client.update(client.id, { company_id: targetCompanyId });
    }
    // סדרות הודעות שייכות לחברת המקור - מעבירים את המנוי אבל עוצרים אותו
    for (const subscription of related.dripSubscriptions) {
        await entities.LeadDripSubscription.update(subscription.id, {
            company_id: targetCompanyId,
            is_active: false
        });
    }

    return {
        lead_id: lead.id,
        meetings: related.meetings.length,
        quotes: related.quotes.length,
        messages: related.messages.length,
        clients: related.clients.length,
        drip_subscriptions_stopped: related.dripSubscriptions.length
    };
};

const copyLead = async (base44, lead, targetCompanyId, leadUpdates) => {
    const entities = base44.asServiceRole.entities;
    const related = await getRelatedRecords(base44, lead.id);

    const newLead = await entities.Lead.create({
        ...stripSystemFields(lead),
        ...leadUpdates,
        company_id: targetCompanyId,
        copied_from_lead_id: lead.id
    });

    for (const meeting of related.meetings) {
        const meetingCopy = stripSystemFields(meeting);
        // לא מקשרים את העותק לאירוע ביומן גוגל, כדי שמחיקה של העותק לא תמחק את האירוע המקורי
        delete meetingCopy.google_event_id;
        await entities.CalendarEvent.create({ ...meetingCopy, related_lead_id: newLead.id, company_id: targetCompanyId });
    }
    for (const quote of related.quotes) {
        await entities.Quote.create({ ...stripSystemFields(quote), lead_id: newLead.id, company_id: targetCompanyId });
    }
    for (const message of related.messages) {
        await entities.WhatsAppMessage.create({ ...stripSystemFields(message), lead_id: newLead.id, company_id: targetCompanyId });
    }
    for (const client of related.clients) {
        await entities.Client.create({ ...stripSystemFields(client), origin_lead_id: newLead.id, company_id: targetCompanyId });
    }
    // מנויים לסדרות הודעות לא מועתקים - אחרת הליד יקבל את ההודעות פעמיים

    return {
        lead_id: lead.id,
        new_lead_id: newLead.id,
        meetings: related.meetings.length,
        quotes: related.quotes.length,
        messages: related.messages.length,
        clients: related.clients.length
    };
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !SUPER_ADMIN_EMAILS.includes(user.email)) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();

        // רשימת חברות ונציגים לבחירה בדיאלוג
        if (body.action === 'list_targets') {
            const [companies, allUsers, memberships] = await Promise.all([
                base44.asServiceRole.entities.Company.list(),
                base44.asServiceRole.entities.User.list(),
                base44.asServiceRole.entities.CompanyUser.list()
            ]);

            const usersByCompany = {};
            for (const company of companies) {
                const memberIds = new Set(memberships.filter(m => m.company_id === company.id).map(m => m.user_id));
                usersByCompany[company.id] = allUsers
                    .filter(u => u.company_id === company.id || memberIds.has(u.id))
                    .map(u => ({ id: u.id, email: u.email, full_name: u.full_name }));
            }

            return Response.json({
                success: true,
                companies: companies.map(c => ({ id: c.id, name: c.name })),
                users_by_company: usersByCompany
            });
        }

        const { lead_ids, target_company_id, mode, assigned_user_id } = body;

        if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
            return Response.json({ success: false, error: 'lead_ids is required' }, { status: 400 });
        }
        if (!target_company_id) {
            return Response.json({ success: false, error: 'target_company_id is required' }, { status: 400 });
        }
        if (mode !== 'move' && mode !== 'copy') {
            return Response.json({ success: false, error: "mode must be 'move' or 'copy'" }, { status: 400 });
        }

        const targetCompanies = await base44.asServiceRole.entities.Company.filter({ id: target_company_id });
        if (targetCompanies.length === 0) {
            return Response.json({ success: false, error: 'Target company not found' }, { status: 404 });
        }
        const targetCompany = targetCompanies[0];

        // נציג - חייב להיות שייך לחברת היעד
        let assignedUser = null;
        if (assigned_user_id) {
            const allUsers = await base44.asServiceRole.entities.User.list();
            const companyUsers = await getCompanyUsers(base44, target_company_id, allUsers);
            assignedUser = companyUsers.find(u => u.id === assigned_user_id) || null;
            if (!assignedUser) {
                return Response.json({ success: false, error: 'הנציג שנבחר לא שייך לחברת היעד' }, { status: 400 });
            }
        }

        const companyNames = new Map([[targetCompany.id, targetCompany.name]]);
        const getCompanyName = async (companyId) => {
            if (!companyId) return 'ללא חברה';
            if (!companyNames.has(companyId)) {
                const found = await base44.asServiceRole.entities.Company.filter({ id: companyId });
                companyNames.set(companyId, found[0]?.name || companyId);
            }
            return companyNames.get(companyId);
        };

        const statusCache = new Map();
        const results = [];
        const errors = [];

        for (const leadId of lead_ids) {
            try {
                const found = await base44.asServiceRole.entities.Lead.filter({ id: leadId });
                const lead = found[0];
                if (!lead) {
                    errors.push({ lead_id: leadId, error: 'Lead not found' });
                    continue;
                }
                if (mode === 'move' && lead.company_id === target_company_id) {
                    errors.push({ lead_id: leadId, error: 'הליד כבר נמצא בחברת היעד' });
                    continue;
                }

                await ensureStatusInCompany(base44, lead.status, lead.company_id, target_company_id, statusCache);

                const sourceName = await getCompanyName(lead.company_id);
                const historyEntry = {
                    campaign: mode === 'move' ? 'העברה בין חברות' : 'העתקה בין חברות',
                    source: sourceName,
                    date: new Date().toISOString(),
                    notes: `${mode === 'move' ? 'הועבר' : 'הועתק'} מ"${sourceName}" ל"${targetCompany.name}" על ידי ${user.email}` +
                        (assignedUser ? ` - שויך לנציג ${assignedUser.full_name || assignedUser.email}` : '')
                };

                const leadUpdates = {
                    campaign_history: [...(lead.campaign_history || []), historyEntry],
                    assigned_user_id: assignedUser?.id || null,
                    assigned_to: assignedUser?.email || null,
                    assigned_to_name: assignedUser ? (assignedUser.full_name || assignedUser.email) : null
                };

                const result = mode === 'move'
                    ? await moveLead(base44, lead, target_company_id, leadUpdates)
                    : await copyLead(base44, lead, target_company_id, leadUpdates);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error transferring lead ${leadId}:`, error);
                errors.push({ lead_id: leadId, error: error.message });
            }
        }

        console.log(`✅ ${mode} finished: ${results.length} succeeded, ${errors.length} failed`);

        return Response.json({
            success: errors.length === 0,
            mode,
            target_company: { id: targetCompany.id, name: targetCompany.name },
            transferred: results.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error transferring leads:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});
