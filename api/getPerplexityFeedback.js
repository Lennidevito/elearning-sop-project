export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { text } = req.body;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are an SOP training coach. Evaluate the employee\'s response and provide constructive feedback in 2-3 sentences. Be encouraging but point out any missing steps or safety concerns.'
          },
          {
            role: 'user',
            content: `Employee's answer to SOP scenario: ${text}`
          }
        ]
      })
    });

    const data = await response.json();
    const aiFeedback = data.choices[0].message.content;

    res.status(200).json({ feedback: aiFeedback });

  } catch (error) {
    console.error('Perplexity API Error:', error);
    res.status(500).json({ error: 'Error connecting to Perplexity API' });
  }
}
