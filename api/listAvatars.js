export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }

    const data = await response.json();
    
    // Filter to show avatar names containing "Annie"
    const allAvatars = data.data.avatars;
    const annieAvatars = allAvatars.filter(avatar => 
      avatar.avatar_name.toLowerCase().includes('annie')
    );
    
    res.status(200).json({ 
      annieAvatars: annieAvatars,
      totalAvatars: allAvatars.length,
      allAvatars: allAvatars.slice(0, 10) // Show first 10 for reference
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
