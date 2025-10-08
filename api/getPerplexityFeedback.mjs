export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            content: 'You are an eLearning SOP training coach providing automated feedback. Evaluate the employee written response and provide constructive feedback in 2-3 sentences. Focus ONLY on their understanding of the procedure - do NOT suggest going through SOPs together, scheduling meetings, or any real-world interactions. This is a self-paced eLearning module. Be encouraging, point out what they did well, and mention any missing steps or safety concerns. Write ONLY in plain conversational English suitable for text-to-speech. Do NOT include markdown, citations, numbers in brackets, bullet points, numbered lists, headers, special characters, or formatting. Only write natural sentences that can be spoken aloud.'
          },
          {
            role: 'user',
            content: `Employee answer to SOP scenario: ${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API Response Error:', response.status, errorText);
      return res.status(500).json({ error: 'Perplexity API request failed' });
    }

    const data = await response.json();
    let aiFeedback = data.choices[0].message.content;
    
    aiFeedback = aiFeedback
      .replace(/\[\d+\]/g, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/\n\d+\.\s/g, ' ')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[-•·]\s/gm, '')
      .replace(/\n[-•·]\s/g, ' ')
      .replace(/[(){}\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    res.status(200).json({ feedback: aiFeedback });

  } catch (error) {
    console.error('Perplexity API Error:', error);
    res.status(500).json({ error: 'Error connecting to Perplexity API', details: error.message });
  }
}
