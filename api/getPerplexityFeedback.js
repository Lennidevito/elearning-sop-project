export default async function handler(req, res) {
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
            content: 'You are a helpful assistant providing feedback on employee SOP responses.'
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    const data = await response.json();
    const aiFeedback = data.choices[0].message.content;

    res.status(200).json({ feedback: aiFeedback });

  } catch (error) {
    res.status(500).json({ error: 'Error connecting to Perplexity API' });
  }
}
