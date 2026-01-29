import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Extract API key from headers
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      return Response.json(
        { status: 'error', error: 'API Key חסר בהידר X-API-Key' },
        { status: 401 }
      );
    }

    // Validate API key
    const base44 = createClientFromRequest(req);
    
    const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({ 
      key: apiKey,
      is_active: true 
    });

    if (apiKeys.length === 0) {
      return Response.json(
        { status: 'error', error: 'API Key לא תקף או לא פעיל' },
        { status: 401 }
      );
    }

    const validKey = apiKeys[0];

    // Return success response
    return Response.json({
      status: 'success',
      message: '✅ Connection successful',
      company_id: validKey.company_id,
      key_name: validKey.name
    });

  } catch (error) {
    console.error('Error in ping endpoint:', error);
    return Response.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
});