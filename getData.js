export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metabaseUrl, questionId } = req.query;

    if (!metabaseUrl || !questionId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: metabaseUrl, questionId' 
      });
    }

    // Validate URL format
    let baseUrl = metabaseUrl;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    const apiUrl = `${baseUrl}/api/public/card/${questionId}/query/json`;
    
    console.log('Fetching from Metabase:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.ok) {
      console.error('Metabase API error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: `Metabase API returned ${response.status}`,
        details: response.statusText
      });
    }

    const data = await response.json();
    
    // Add metadata
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: data,
      recordCount: Array.isArray(data) ? data.length : (data.data?.rows?.length || 0)
    };

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
