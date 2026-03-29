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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Cron job: Monthly VIP rewards
  app.post("/api/cron/monthly-vip-rewards", async (req, res) => {
    const { secret } = req.body;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // 1. Fetch top 50 users based on EXP
      const { data: topUsers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, exp, balance')
        .order('exp', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (!topUsers || topUsers.length === 0) {
        return res.json({ message: "No users to reward." });
      }

      // Helper to calculate VIP
      const getVip = (exp: number) => {
        const level = Math.floor(Math.sqrt(exp / 10)) + 1;
        if (level < 5) return 1;
        if (level < 15) return 2;
        if (level < 30) return 3;
        if (level < 50) return 4;
        return 5 + Math.floor((level - 50) / 15);
      };

      // 2. Distribute rewards
      for (const user of topUsers) {
        const vip = getVip(user.exp || 0);
        let reward = 0;
        if (vip === 3) reward = 1000;
        else if (vip === 4) reward = 2000;
        else if (vip === 5) reward = 4000;
        else if (vip === 6) reward = 5000;
        else if (vip >= 7) reward = 10000;

        if (reward > 0) {
          await supabase
            .from('profiles')
            .update({ balance: (user.balance || 0) + reward })
            .eq('id', user.id);
            
          await supabase
            .from('transactions')
            .insert([{
              user_id: user.id,
              type: 'MONTHLY_VIP_REWARD',
              amount: reward,
              description: `Thưởng VIP tháng (VIP ${vip})`,
              status: 'COMPLETED'
            }]);
        }
      }

      res.json({ message: `Successfully distributed rewards to ${topUsers.length} users.` });
    } catch (err: any) {
      console.error("Monthly VIP Reward Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // hCaptcha verification
  app.post("/api/verify-hcaptcha", async (req, res) => {
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
  app.get("/api/proxy-vuotnhanh", async (req, res) => {
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
