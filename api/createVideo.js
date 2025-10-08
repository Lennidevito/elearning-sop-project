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
    const response = await fetch('https://api.synthesia.io/v2/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SYNTHESIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'SOP Training Feedback',
        description: 'AI-generated feedback video',
        visibility: 'private',
        input: [
          {
            avatarSettings: {
              horizontalAlign: 'center',
              scale: 1,
              style: 'rectangular',
              seamless: false
            },
            avatar: 'anna_costume1_cameraA',
            backgroundSettings: {
              videoSettings: {
                shortBackgroundContentMatchMode: 'freeze',
                longBackgroundContentMatchMode: 'trim'
              }
            },
            background: 'green_screen',
            scriptText: text,
            voice: 'en-US-JennyNeural'
          }
        ]
      })
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Synthesia API Response Error:', response.status, errorText);
      return res.status(500).json({ error: 'Synthesia API request failed', details: errorText });
    }

    const data = await response.json();
    console.log('Synthesia API response data:', data);
    
    // Return video ID and construct URL
    const videoId = data.id;
    
    res.status(200).json({ 
      videoId: videoId,
      videoUrl: `https://share.synthesia.io/embeds/videos/${videoId}`,
      status: data.status,
      fullResponse: data
    });

  } catch (error) {
    console.error('Synthesia API Error:', error);
    res.status(500).json({ error: 'Error creating video with Synthesia', details: error.message });
  }
}
