import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Configure Proxy for Axios if provided
const proxyUrl = process.env.STATIC_PROXY_URL || process.env.FIXIE_URL || "";
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
const getAxiosConfig = (config: any = {}) => {
  if (httpsAgent) {
    config.httpsAgent = httpsAgent;
    config.httpAgent = httpsAgent; 
    config.proxy = false;
  }
  return config;
};

// Use service role key for backend operations to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const app = express();
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running on Vercel" });
});

// --- RECHARGE API ENDPOINTS ---
const OPERATOR_MAPPING: Record<string, string> = {
    "Airtel": "A", "Vodafone": "V", "Vi": "V", "BSNL TOPUP": "BT", "BSNL": "BT",
    "Reliance Jio": "RC", "Jio": "RC", "Idea": "I", "BSNL STV": "BR"
};

const CIRCLE_MAPPING: Record<string, string> = {
    "West Bengal": "2", "Bihar": "17", "Assam": "24", "Odisha": "23", "Jharkhand": "22",
    "Delhi": "5", "Mumbai": "3", "Tamil Nadu": "8", "Karnataka": "9", "Kerala": "14",
    "Gujarat": "12", "Rajasthan": "18", "Punjab": "1", "Haryana": "20", "UP East": "10",
    "UP West": "11", "Maharashtra": "4", "North East": "26", "Kolkata": "6"
};

const getApiConfig = async () => {
    try {
      const { data: allConfig } = await supabase.from("config").select("*");
      const globalEntry = allConfig?.find(c => c.key.toLowerCase() === 'global');
      return globalEntry?.value?.api || {};
    } catch (err) { return {}; }
};

app.get("/api/recharge/balance", async (req, res) => {
    try {
      const config = await getApiConfig();
      const { url = "https://business.a1topup.com", userId, password } = config;
      if (!userId || !password) return res.status(400).json({ error: "Missing config" });
      const params = { username: userId, pwd: password, format: "json" };
      const response = await axios.get(`${url}/recharge/balance`, getAxiosConfig({ params }));
      res.json(response.data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post("/api/recharge/process", async (req, res) => {
    const { mobile, operator, amount, circle, userId } = req.body;
    try {
      if (userId) {
        const { data: userProfile } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
        if (userProfile?.email?.trim().toLowerCase() === 'ashish.10bd@gmail.com') {
          return res.json({ status: "success", message: "Simulated Success", txnId: "MOCK" + Date.now(), opid: "OPID" + Date.now() });
        }
      }

      const config = await getApiConfig();
      const { url = "https://business.a1topup.com", userId: apiUser, password: apiPassword } = config;
      const orderId = `TXN_${Date.now()}`;
      const params = {
        username: apiUser, pwd: apiPassword, circlecode: CIRCLE_MAPPING[circle] || circle,
        operatorcode: OPERATOR_MAPPING[operator] || operator, number: mobile, amount, orderid: orderId, format: "json"
      };
      
      const response = await axios.get(`${url}/recharge/api`, getAxiosConfig({ params }));
      let apiData = response.data;
      if (typeof apiData === 'string') {
          const parts = apiData.split(',');
          if (parts.length >= 2) apiData = { txid: parts[0], status: parts[1], opid: parts[2] };
      }
      
      res.json({ ...apiData, txnId: orderId, normalizedStatus: (apiData.status?.toLowerCase() === 'success' || apiData.status === '1') ? 'success' : 'failed' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Admin routes
app.get("/api/config/:key", async (req, res) => {
    const { key } = req.params;
    const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
    res.json({ success: true, data: data?.value || null });
});

app.post("/api/admin/config", async (req, res) => {
    const { key, value } = req.body;
    await supabase.from('config').upsert({ key, value }, { onConflict: 'key' });
    res.json({ success: true });
});

app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, mobile, dob, role, distributor_id, created_by } = req.body;
    try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email || `${mobile}@recharge.com`, password, email_confirm: true, user_metadata: { name, mobile, role, dob }
        });
        if (authError) return res.status(400).json({ error: authError.message });
        await supabase.from('profiles').upsert({ id: authData.user.id, name, mobile, email: email || `${mobile}@recharge.com`, dob: dob || '1995-11-13', role: role || 'retailer', distributor_id, created_by: created_by || 'Distributor', wallet_balance: 0, mpin: '1111', kyc_status: 'pending', status: 'active' });
        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post("/api/admin/update-wallet", async (req, res) => {
    const { userId, amount, type, remark } = req.body;
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!profile) return res.status(404).json({ error: "User not found" });
        const finalAmount = type === 'credit' ? parseFloat(amount) : -parseFloat(amount);
        const newBalance = (profile.wallet_balance || 0) + finalAmount;
        await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
        await supabase.from('transactions').insert([{ user_id: userId, type: 'wallet_add', amount: Math.abs(finalAmount), status: 'success', details: { note: remark || `Admin ${type}`, closing_balance: newBalance } }]);
        res.json({ success: true, newBalance });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default app;
