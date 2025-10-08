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
    // Step 1: Create summary with Perplexity (5-second video = ~15 words)
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
    
    // Comprehensive cleaning for TTS - remove EVERYTHING that shouldn't be spoken
    videoScript = videoScript
      // Remove citations [1], [2], etc.
      .replace(/\[\d+\]/g, '')
      // Remove numbered lists like "1.", "2.", etc.
      .replace(/^\d+\.\s/gm, '')
      .replace(/\n\d+\.\s/g, ' ')
      // Remove markdown headers
      .replace(/#{1,6}\s/g, '')
      // Remove bold/italic
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Remove code formatting
      .replace(/`(.*?)`/g, '$1')
      // Remove bullet points
      .replace(/^[-•·]\s/gm, '')
      .replace(/\n[-•·]\s/g, ' ')
      // Remove parentheses and brackets
      .replace(/[(){}\[\]]/g, '')
      // Remove line breaks
      .replace(/\n+/g, ' ')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Remove any remaining special characters except basic punctuation
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
    console.log('Video generation started:', videoId);

    // Step 3: Wait for video to be ready (poll status)
    let videoReady = false;
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes max (24 * 5 seconds)

    while (!videoReady && attempts < maxAttempts) {
      // Wait 5 seconds before checking
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`Video status check ${attempts + 1}:`, statusData.data.status);
        
        if (statusData.data.status === 'completed') {
          videoReady = true;
          videoUrl = statusData.data.video_url;
          console.log('Video is ready!', videoUrl);
        } else if (statusData.data.status === 'failed') {
          console.error('Video generation failed');
          break;
        }
      }
      
      attempts++;
    }

    // Use either the completed video URL or the share URL as fallback
    const finalVideoUrl = videoUrl || `https://app.heygen.com/share/${videoId}`;

    // Step 4: Send email using Brevo with Reply-To
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
            ${videoReady ? 
              '<p style="font-size: 14px; color: #28a745; font-weight: bold;">✅ Your video is ready to watch!</p>' :
              '<p style="font-size: 14px; color: #666;"><strong>Note:</strong> Your video may still be processing. It will be ready in just a moment.</p>'
            }
            <div style="text-align: center; margin: 30px 0;">
              <a href="${finalVideoUrl}" style="display: inline-block; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Watch Your Learning Summary</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy this link: <br><a href="${finalVideoUrl}">${finalVideoUrl}</a></p>
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
      message: videoReady ? 
        'Email sent! Your video is ready to watch now.' : 
        'Email sent! Your video will be ready shortly.',
      videoId: videoId,
      videoReady: videoReady
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
