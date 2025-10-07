export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { text } = req.body;

  try {
    const response = await fetch('https://api.perplexity.ai/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`, // Using secret from environment
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: text })
    });

    const data = await response.json();
    const aiFeedback = data.answer;

    res.status(200).json({ feedback: aiFeedback });

  } catch (error) {
    res.status(500).json({ error: 'Error connecting to Perplexity API' });
  }
}
