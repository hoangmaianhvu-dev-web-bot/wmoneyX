export default async function handler(req: any, res: any) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await fetch(url as string);
    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    res.status(200).json(data);
  } catch (err: any) {
    console.error("Proxy Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
