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

  const { email, chatHistory } = req.body;

  try {
    // Step 1: Create summary with Perplexity
    const summaryResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: 'You are a learning coach. Create a VERY short 5-second video script (maximum 15 words) with one key learning takeaway. Be concise and encouraging. Write ONLY in plain conversational English suitable for text-to-speech. Do NOT include: markdown, citations, numbers in brackets, bullet points, numbered lists, headers, special characters, or formatting. Only write natural sentences that can be spoken aloud.'
          },
          {
            role: 'user',
            content: `Summarize the most important learning point from this conversation in maximum 15 words as natural speech: ${chatHistory}`
          }
        ]
      })
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('Perplexity Error:', errorText);
      return res.status(500).json({ error: 'Failed to create summary' });
    }

    const summaryData = await summaryResponse.json();
    let videoScript = summaryData.choices[0].message.content;
    
    // Comprehensive cleaning for TTS
    videoScript = videoScript
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
      .replace(/[^a-zA-Z0-9\s.,!?'-]/g, '')
      .trim();
    
    console.log('Video script created:', videoScript);

    // Step 2: Create HeyGen video
    const videoResponse = await fetch('https://api.heygen.com/v2/video/generate', {
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
              input_text: videoScript,
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

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      console.error('HeyGen Error:', errorText);
      return res.status(500).json({ error: 'Failed to create video' });
    }

    const videoData = await videoResponse.json();
    const videoId = videoData.data.video_id;
    const videoUrl = `https://app.heygen.com/share/${videoId}`;
    console.log('Video generation started:', videoId);

    // Step 3: Send immediate email with processing message
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Lennart eLearning',
          email: 'lennart.elearning@gmail.com'
        },
        replyTo: {
          email: 'lennart.elearning@gmail.com',
          name: 'Lennart'
        },
        to: [{ email: email }],
        subject: 'Your Personalized Learning Summary Video',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Great work on completing your learning session!</h2>
            <p style="font-size: 16px; line-height: 1.6;">We've created a personalized 5-second video summarizing your key learning point.</p>
            <p style="font-size: 14px; color: #666;"><strong>Note:</strong> Your video is being generated and will be ready in 1-2 minutes. Click the button below to watch it.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${videoUrl}" style="display: inline-block; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Watch Your Learning Summary</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy this link: <br><a href="${videoUrl}">${videoUrl}</a></p>
            <p style="color: #999; font-size: 13px; font-style: italic;">Tip: If the video is still processing when you click, wait a moment and refresh the page.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">This video was generated based on your learning conversation.</p>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email send error:', errorText);
      return res.status(500).json({ error: 'Failed to send email', details: errorText });
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent:', emailResult);

    res.status(200).json({ 
      success: true,
      message: 'Email sent successfully! Your video will be ready in 1-2 minutes.',
      videoId: videoId
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
