// File: /api/getPerplexityFeedback.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { text } = req.body;  // Get the user input sent from Storyline

  // TODO: call Perplexity Pro API here with 'text'
  // For teaching, let's mock a response as if Perplexity replied:

  const aiFeedback = `AI feedback on your input: ${text}`;  // Replace with actual API call

  res.status(200).json({ feedback: aiFeedback });
}
