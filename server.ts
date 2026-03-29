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
  app.get("/api-server/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // hCaptcha verification
  app.post("/api-server/verify-hcaptcha", async (req, res) => {
    console.log("Received hCaptcha verification request");
    const { token } = req.body;
    const secret = process.env.HCAPTCHA_SECRET || "ES_cc4c49b56626414a82adf8a814f998e0";

    if (!token) {
      console.error("hCaptcha Error: Token is missing");
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', secret);
      params.append('response', token);

      console.log("Calling hCaptcha siteverify...");
      const response = await fetch("https://hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`hCaptcha API Error (${response.status}):`, errorText);
        throw new Error(`hCaptcha API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log("hCaptcha verification result:", data.success);
      res.json(data);
    } catch (err: any) {
      console.error("hCaptcha Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Proxy for VuotNhanh API to bypass CORS
  app.get("/api-server/proxy-vuotnhanh", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await fetch(url as string);
      
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
