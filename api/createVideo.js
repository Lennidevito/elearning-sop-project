export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { text } = req.body;

  try {
    // Create video with Synthesia API
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

    const data = await response.json();
    
    // Return the video ID - you'll need to check status later
    res.status(200).json({ 
      videoId: data.id,
      videoUrl: `https://share.synthesia.io/embeds/videos/${data.id}`
    });

  } catch (error) {
    console.error('Synthesia API Error:', error);
    res.status(500).json({ error: 'Error creating video with Synthesia' });
  }
}
