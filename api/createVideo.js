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

  // Clean the text for video narration
  let cleanText = text
    .replace(/#{1,6}\s/g, '')  // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
    .replace(/\*(.*?)\*/g, '$1')  // Remove italic
    .replace(/`(.*?)`/g, '$1')  // Remove code
    .replace(/[-•·]/g, '')  // Remove bullet points
    .replace(/\n+/g, ' ')  // Replace line breaks with spaces
    .replace(/\s+/g, ' ')  // Remove extra spaces
    .trim();

  try {
    // Create video with HeyGen API
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_inputs: [
          {
character: {
  type: 'avatar',
  avatar_id: 'Annie_Business_Casual_Standing_Front_public',
  avatar_style: 'normal'
},


            voice: {
              type: 'text',
              input_text: cleanText,
              voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54'
            }
          }
        ],
        dimension: {
          width: 1280,
          height: 720
        },
        aspect_ratio: '16:9'
      })
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API Response Error:', response.status, errorText);
      return res.status(500).json({ error: 'HeyGen API request failed', details: errorText });
    }

    const data = await response.json();
    console.log('HeyGen API response data:', data);
    
    // HeyGen returns a video_id
