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
              avatar_id: 'Tyler-insuit-20220721',
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: text,
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
    const videoId = data.data.video_id;
    
    res.status(200).json({ 
      videoId: videoId,
      videoUrl: `https://app.heygen.com/share/${videoId}`,
      status: 'processing',
      message: 'Video is being generated. This may take 1-2 minutes.'
    });

  } catch (error) {
    console.error('HeyGen API Error:', error);
    res.status(500).json({ error: 'Error creating video with HeyGen', details: error.message });
  }
}
