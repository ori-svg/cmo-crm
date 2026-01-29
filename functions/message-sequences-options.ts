import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Extract API key from headers
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      return Response.json(
        { error: 'API Key חסר בהידר X-API-Key' },
        { status: 401 }
      );
    }

    // Initialize Base44 client
    const base44 = createClientFromRequest(req);

    // Verify API key and get company_id
    const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
      key: apiKey,
      is_active: true
    });

    if (apiKeys.length === 0) {
      return Response.json(
        { error: 'API Key לא תקין או לא פעיל' },
        { status: 401 }
      );
    }

    const apiKeyRecord = apiKeys[0];
    const company_id = apiKeyRecord.company_id;

    if (!company_id) {
      return Response.json(
        { error: 'API Key לא משויך לחברה' },
        { status: 400 }
      );
    }

    // Get active drip campaigns for the company
    const campaigns = await base44.asServiceRole.entities.WhatsAppDripCampaign.filter({
      company_id: company_id,
      is_active: true
    });

    // Format for Make selector - array of {label, value}
    const options = campaigns.map(campaign => ({
      label: campaign.name,
      value: campaign.id
    }));

    // Return plain array (no wrapper)
    return Response.json(options);

  } catch (error) {
    console.error('Error fetching message sequences:', error);
    return Response.json(
      { error: 'שגיאה פנימית בשרת', details: error.message },
      { status: 500 }
    );
  }
});