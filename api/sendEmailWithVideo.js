// Step 3: Wait for video to be ready (poll status)
let videoReady = false;
let videoUrl = null;
let attempts = 0;
const maxAttempts = 60; // 20 minutes max (60 * 20 seconds)

while (!videoReady && attempts < maxAttempts) {
  // Wait 20 seconds before checking
  await new Promise(resolve => setTimeout(resolve, 20000));
  
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
