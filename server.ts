import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { supabase } from "./src/supabase";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Request logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy for VuotNhanh API to bypass CORS
  app.get("/api/proxy-vuotnhanh", async (req, res) => {
    const { api, url } = req.query;
    if (!api || !url) {
      return res.status(400).json({ error: "API key and URL are required" });
    }

    try {
      const targetUrl = `https://vuotnhanh.com/api?api=${api}&url=${encodeURIComponent(url as string)}`;
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("Proxy Error - Response not OK:", response.status, text);
        return res.status(response.status).json({ error: `Proxy failed with status ${response.status}`, details: text });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error("Proxy Error - Response not JSON:", text);
        res.status(500).json({ error: "Response is not JSON", details: text });
      }
    } catch (err: any) {
      console.error("Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
