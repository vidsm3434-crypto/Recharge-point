import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Configure Proxy for Axios if provided
const proxyUrl = process.env.STATIC_PROXY_URL || process.env.FIXIE_URL || "http://uljorgxk:huk93w7n1k46@31.59.20.176:6754/";
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
const getAxiosConfig = (config: any = {}) => {
  if (httpsAgent) {
    config.httpsAgent = httpsAgent;
    // Also set httpAgent in case the target URL is http://
    config.httpAgent = httpsAgent; 
    config.proxy = false;
  }
  return config;
};

// Use service role key for backend operations to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check for Vercel deployment
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running on Vercel" });
});

// --- RECHARGE API ENDPOINTS ---

// Mappings for A1Topup
const OPERATOR_MAPPING: Record<string, string> = {
    "Airtel": "A",
    "Vodafone": "V",
    "Vi": "V",
    "BSNL TOPUP": "BT",
    "BSNL": "BT",
    "Reliance Jio": "RC",
    "Jio": "RC",
    "Idea": "I",
    "BSNL STV": "BR"
  };

  const CIRCLE_MAPPING: Record<string, string> = {
    "West Bengal": "2",
    "Bihar": "17",
    "Assam": "24",
    "Odisha": "23",
    "Jharkhand": "22",
    "Delhi": "5",
    "Mumbai": "3",
    "Tamil Nadu": "8",
    "Karnataka": "9",
    "Kerala": "14",
    "Gujarat": "12",
    "Rajasthan": "18",
    "Punjab": "1",
    "Haryana": "20",
    "UP East": "10",
    "UP West": "11",
    "Maharashtra": "4",
    "North East": "26",
    "Kolkata": "6"
  };

  // Helper to get API config
  const getApiConfig = async () => {
    try {
      // Fetch all config to see what's available (debugging)
      const { data: allConfig, error: fetchError } = await supabase
        .from("config")
        .select("*");
      
      if (fetchError) {
        console.error("Error fetching config table:", fetchError.message);
        return {};
      }

      // Find the global config case-insensitively or by exact match
      const globalEntry = allConfig?.find(c => c.key.toLowerCase() === 'global');
      
      if (!globalEntry) {
        console.error("Global config entry NOT FOUND in table. Available keys:", allConfig?.map(c => c.key));
        return {};
      }

      const fullConfig = globalEntry.value || {};
      const apiConfig = fullConfig.api || {};
      
      console.log("Retrieved API Config from DB:", { 
        url: apiConfig.url,
        userId: apiConfig.userId,
        hasPassword: !!apiConfig.password,
        availableKeys: Object.keys(apiConfig)
      });

      return apiConfig;
    } catch (err: any) {
      console.error("getApiConfig Exception:", err.message);
      return {};
    }
  };

  // Get Balance from A1Topup
  app.get("/api/recharge/balance", async (req, res) => {
    let fullUrl = "";
    try {
      const config = await getApiConfig();
      const { url = "https://business.a1topup.com", userId, password } = config;

      if (!userId || !password) {
        return res.status(400).json({ error: "API Username or Password not configured" });
      }

      const params = {
        username: userId,
        pwd: password,
        format: "json"
      };

      fullUrl = `${url}/recharge/balance?${new URLSearchParams(params as any).toString()}`;
      console.log(`Checking A1Topup balance: ${fullUrl}`);

      const response = await axios.get(`${url}/recharge/balance`, getAxiosConfig({ params }));
      const apiData = response.data;

      if (typeof apiData === 'string' && apiData.includes("Parameter is missing")) {
        return res.status(400).json({ 
          error: "API Error: Parameter is missing", 
          details: apiData,
          debug: { url: fullUrl, raw: apiData }
        });
      }

      res.json({
        ...apiData,
        debug: {
          url: fullUrl,
          raw: apiData
        }
      });
    } catch (error: any) {
      console.error("Balance API Error:", error.message);
      res.status(500).json({ 
        error: "Failed to fetch balance", 
        details: error.message,
        debug: { url: fullUrl, raw: error.response?.data || error.message }
      });
    }
  });

  // Process Recharge (A1Topup specialized)
  app.post("/api/recharge/process", async (req, res) => {
    const { mobile, operator, amount, circle, userId } = req.body;

    try {
      let userProfile = null;
      if (userId) {
        // 1. Fetch user profile to check email
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        } else {
          userProfile = data;
        }
      }

      const orderId = `TXN_${Date.now()}`;

      // 2. Check for specific DRMO retailer
      if (userProfile?.email?.trim().toLowerCase() === 'ashish.10bd@gmail.com') {
        console.log(`Simulating DRMO recharge for ${userProfile.email}`);
        
        // Simulate a successful response without hitting the API
        const simulatedResponse = {
          status: "Success",
          txid: "TXN" + Date.now(),
          opid: "OP" + Date.now(),
          number: mobile,
          amount: amount,
          orderid: orderId
        };

        return res.json({
          status: "success",
          message: "Recharge Successful!",
          txnId: simulatedResponse.txid,
          opid: simulatedResponse.opid,
          data: simulatedResponse,
          normalizedStatus: "success"
        });
      }

      // 3. Normal API processing for other users
      const config = await getApiConfig();
      const { 
        url = "https://business.a1topup.com", 
        userId: apiUser, 
        password: apiPassword,
        successKey = "status",
        successValue = "Success"
      } = config;

      if (!url) {
        return res.status(400).json({ error: "API URL not configured" });
      }

      const operatorCode = OPERATOR_MAPPING[operator] || operator;
      const circleCode = CIRCLE_MAPPING[circle] || circle;

      const params = {
        username: apiUser,
        pwd: apiPassword,
        circlecode: circleCode,
        operatorcode: operatorCode,
        number: mobile,
        amount: amount,
        orderid: orderId,
        format: "json"
      };

      const fullUrl = `${url}/recharge/api?${new URLSearchParams(params as any).toString()}`;
      console.log(`Sending A1Topup recharge request: ${fullUrl}`);

      let response;
      let rawResponse = "";
      if (url.includes("example.com")) {
        rawResponse = JSON.stringify({
          status: "Success",
          txid: "MOCK" + Date.now(),
          opid: "OP" + Date.now(),
          number: mobile,
          amount: amount,
          orderid: orderId
        });
        response = { data: JSON.parse(rawResponse) };
      } else {
        try {
          const axiosRes = await axios.get(`${url}/recharge/api`, getAxiosConfig({ params, responseType: 'text' }));
          rawResponse = axiosRes.data;
          
          if (!rawResponse) {
            return res.status(500).json({ error: "API Not Responding", debug: { url: fullUrl, raw: "" } });
          }

          // Try parsing as JSON first
          try {
            response = { data: JSON.parse(rawResponse) };
          } catch (e) {
            // If not JSON, try CSV (A1Topup sometimes returns CSV if format=json is missing or ignored)
            // Example: 1225,Success,WB22565584,9800000000,10,485668
            const parts = rawResponse.split(',');
            if (parts.length >= 2) {
              response = {
                data: {
                  txid: parts[0],
                  status: parts[1],
                  opid: parts[2],
                  number: parts[3],
                  amount: parts[4],
                  orderid: parts[5] || orderId
                }
              };
            } else {
              return res.status(500).json({ error: "Invalid Response Format", debug: { url: fullUrl, raw: rawResponse } });
            }
          }
        } catch (axiosErr: any) {
          console.error("Axios Request Error:", axiosErr.message);
          return res.status(500).json({ error: "API Connection Failed", debug: { url: fullUrl, raw: axiosErr.message } });
        }
      }

      const apiData = response.data;
      const apiStatus = apiData[successKey] || apiData.status;
      
      if (!apiStatus) {
        return res.status(500).json({ error: "Unknown Status", debug: { url: fullUrl, raw: rawResponse, parsed: apiData } });
      }

      let status = "pending";
      if (String(apiStatus).toLowerCase() === successValue.toLowerCase() || String(apiStatus) === "1") {
        status = "success";
      } else if (String(apiStatus).toLowerCase() === "failure" || String(apiStatus).toLowerCase() === "failed" || String(apiStatus) === "0") {
        status = "failed";
      }

      res.json({
        ...apiData,
        normalizedStatus: status,
        txnId: orderId,
        apiTxId: apiData.txid || apiData.opid,
        debug: {
          url: fullUrl,
          raw: rawResponse,
          parsed: apiData
        }
      });
    } catch (error: any) {
      console.error("Recharge API Error:", error.message);
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message 
      });
    }
  });

  // Check Status (A1Topup specialized)
  app.get("/api/recharge/status/:txnId", async (req, res) => {
    const { txnId } = req.params;

    try {
      const config = await getApiConfig();
      const { url = "https://business.a1topup.com", userId: apiUser, password: apiPassword } = config;

      const response = await axios.get(`${url}/recharge/status`, getAxiosConfig({
        params: {
          username: apiUser,
          pwd: apiPassword,
          orderid: txnId,
          format: "json"
        }
      }));

      res.json(response.data);
    } catch (error: any) {
      console.error("Status Check Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // --- CALLBACK ENDPOINT ---
  const handleCallback = async (req: express.Request, res: express.Response) => {
    const data = { ...req.query, ...req.body };
    console.log("Received Recharge Callback:", data);

    // A1Topup uses: txid (our orderid), status (Success/Failure), opid (operator txn id)
    const tranId = data.txid || data.TRANID || data.tranid || data.client_id;
    const statusRaw = data.status || data.STATUS || data.status;
    const liveId = data.opid || data.LIVEID || data.liveid || data.operator_id;
    const msg = data.msg || data.MSG || data.message;

    if (!tranId) {
      return res.status(400).json({ error: "TRANID/txid missing in callback" });
    }

    try {
      const config = await getApiConfig();
      const { successKey = "status", successValue = "SUCCESS" } = config;

      // 1. Find the transaction in Supabase
      // We search inside the 'details' JSONB column for the txnId
      const { data: transactions, error: findError } = await supabase
        .from("transactions")
        .select("*")
        .filter("details->>txnId", "eq", tranId)
        .limit(1);

      if (findError || !transactions || transactions.length === 0) {
        console.error("Transaction not found for callback TRANID:", tranId);
        return res.status(404).json({ error: "Transaction not found" });
      }

      const transaction = transactions[0];
      const currentStatus = transaction.status;

      // 2. Map status
      let newStatus = "pending";
      if (String(statusRaw) === successValue || String(statusRaw) === "1" || String(statusRaw).toUpperCase() === "SUCCESS") {
        newStatus = "success";
      } else if (String(statusRaw) === "0" || String(statusRaw).toUpperCase() === "FAILED" || String(statusRaw).toUpperCase() === "FAILURE") {
        newStatus = "failed";
      }

      // 3. Update transaction
      const updatedDetails = {
        ...transaction.details,
        operator_txn_id: liveId,
        callback_msg: msg,
        callback_raw: data,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: newStatus,
          details: updatedDetails
        })
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      // 4. Handle Wallet Refund if status changed from success/pending to failed
      if (newStatus === "failed" && (currentStatus === "success" || currentStatus === "pending")) {
        const refundAmount = transaction.amount;
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", transaction.user_id)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ wallet_balance: (profile.wallet_balance || 0) + refundAmount })
            .eq("id", transaction.user_id);

          // Log refund transaction
          await supabase.from("transactions").insert([
            {
              user_id: transaction.user_id,
              type: "refund",
              amount: refundAmount,
              status: "success",
              details: {
                note: `Refund for failed recharge ${tranId}`,
                original_txn_id: transaction.id,
                mobile: transaction.details?.mobile || 'N/A'
              }
            }
          ]);
        }
      }

      res.json({ status: "ok", message: "Callback processed" });
    } catch (error: any) {
      console.error("Callback Processing Error:", error.message);
      res.status(500).json({ error: "Internal server error processing callback" });
    }
  };

  app.get("/api/callback", handleCallback);
  app.post("/api/callback", handleCallback);

  // --- ADMIN CONFIG ENDPOINTS ---
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, mobile, dob, role, distributor_id, created_by } = req.body;
    
    try {
      console.log("Attempting to create user:", { email, name, mobile, dob, role });
      
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      }

      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check if mobile already exists
      const { data: existingMobile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();
      
      if (existingMobile) {
        return res.status(400).json({ error: "Mobile number already registered" });
      }

      // 1. Create the user in Auth
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: email || `${mobile}@recharge.com`,
        password: password,
        email_confirm: true,
        user_metadata: { name, mobile, role, dob }
      });

      if (authError) {
        console.error("Auth Creation Error:", authError.message);
        return res.status(400).json({ error: authError.message });
      }

      if (authData.user) {
        console.log("Auth user created:", authData.user.id);
        
        // 2. Upsert the profile in the profiles table
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            name,
            mobile,
            email: email || `${mobile}@recharge.com`,
            dob: dob || '1995-11-13', // Default if not provided
            role: role || 'retailer',
            distributor_id,
            created_by: created_by || 'Distributor',
            wallet_balance: 0,
            mpin: '1111', // Default MPIN
            kyc_status: 'pending',
            status: 'active',
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileError) {
          console.error("Profile Upsert Error:", profileError.message);
          // Even if profile upsert fails, the auth user is created. 
          // But we should report the error.
          return res.status(500).json({ error: "User created but profile setup failed", details: profileError.message });
        }
        
        console.log("Profile created/updated successfully");
        res.json({ success: true, user: authData.user });
      } else {
        throw new Error("Failed to create user - no data returned");
      }
    } catch (error: any) {
      console.error("Admin Create User Exception:", error.message);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  app.post("/api/admin/config", async (req, res) => {
    const { key, value } = req.body;
    
    try {
      // Use service role key for admin operations
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      }

      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      const { error } = await adminSupabase
        .from('config')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      
      res.json({ success: true, message: "Configuration updated" });
    } catch (error: any) {
      console.error("Admin Config Update Error:", error.message);
      res.status(500).json({ error: "Failed to update configuration", details: error.message });
    }
  });

  app.post("/api/admin/transfer-balance", async (req, res) => {
    const { fromUserId, toUserId, amount, remark, type } = req.body;
    
    try {
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      }

      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const transferAmount = parseFloat(amount);

      if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // 1. Get both profiles
      const { data: fromProfile, error: fromError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', fromUserId)
        .maybeSingle();

      const { data: toProfile, error: toError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', toUserId)
        .maybeSingle();

      if (fromError || !fromProfile) return res.status(404).json({ error: "Source user not found" });
      if (toError || !toProfile) return res.status(404).json({ error: "Target user not found" });

      // 2. Check balance if it's a transfer or deduct
      if (type === 'transfer' && fromProfile.wallet_balance < transferAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      if (type === 'deduct' && toProfile.wallet_balance < transferAmount) {
        return res.status(400).json({ error: "Retailer has insufficient balance" });
      }

      // 3. Perform updates
      let fromNewBalance = fromProfile.wallet_balance;
      let toNewBalance = toProfile.wallet_balance;

      if (type === 'transfer') {
        fromNewBalance -= transferAmount;
        toNewBalance += transferAmount;
      } else if (type === 'deduct') {
        fromNewBalance += transferAmount;
        toNewBalance -= transferAmount;
      }

      const { error: updateFromError } = await adminSupabase
        .from('profiles')
        .update({ wallet_balance: fromNewBalance })
        .eq('id', fromUserId);

      const { error: updateToError } = await adminSupabase
        .from('profiles')
        .update({ wallet_balance: toNewBalance })
        .eq('id', toUserId);

      if (updateFromError || updateToError) {
        throw new Error("Failed to update balances");
      }

      // 4. Record transactions
      const txnId = `${type === 'transfer' ? 'TRF' : 'DED'}${Date.now()}`;
      
      await adminSupabase.from('transactions').insert([
        {
          user_id: toUserId,
          type: type === 'transfer' ? 'wallet_add' : 'wallet_deduct',
          amount: transferAmount,
          status: 'success',
          details: {
            note: remark || (type === 'transfer' ? 'Transfer from Distributor' : 'Deducted by Distributor'),
            distributor_id: fromUserId,
            txnId: txnId,
            closing_balance: toNewBalance
          }
        },
        {
          user_id: fromUserId,
          type: type === 'transfer' ? 'wallet_add' : 'wallet_add', // Both are wallet_add but with different notes/types
          amount: transferAmount,
          status: 'success',
          details: {
            note: type === 'transfer' ? `Transfer to ${toProfile.name}` : `Deducted from ${toProfile.name}`,
            retailer_id: toUserId,
            type: type === 'transfer' ? 'debit' : 'credit',
            txnId: txnId,
            closing_balance: fromNewBalance
          }
        }
      ]);

      res.json({ success: true, fromNewBalance, toNewBalance });
    } catch (error: any) {
      console.error("Transfer API Error:", error.message);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  app.post("/api/admin/update-wallet", async (req, res) => {
    const { userId, amount, type, remark } = req.body;
    
    try {
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      }

      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const updateAmount = parseFloat(amount);

      if (isNaN(updateAmount) || updateAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // 1. Get user profile
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) return res.status(404).json({ error: "User not found" });

      // 2. Check for DRMO retailer
      if (profile.email?.trim().toLowerCase() === 'ashish.10bd@gmail.com') {
        console.log(`Simulating DRMO wallet update for ${profile.email}`);
        
        // Record transaction but don't update balance
        await adminSupabase.from('transactions').insert([
          {
            user_id: userId,
            type: 'wallet_add',
            amount: updateAmount,
            status: 'success',
            details: {
              note: remark || `Admin ${type}`,
              adminAction: true,
              type: type,
              txnId: `ADM${Date.now()}`,
              closing_balance: profile.wallet_balance || 0
            }
          }
        ]);

        return res.json({ success: true, newBalance: profile.wallet_balance || 0, message: "Wallet updated successfully" });
      }

      // 3. Calculate new balance
      const finalAmount = type === 'credit' ? updateAmount : -updateAmount;
      const newBalance = (profile.wallet_balance || 0) + finalAmount;

      if (newBalance < 0) {
        return res.status(400).json({ error: "Insufficient balance for deduction" });
      }

      // 3. Update balance
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 4. Record transaction
      await adminSupabase.from('transactions').insert([
        {
          user_id: userId,
          type: 'wallet_add', // Using wallet_add for all admin credits/debits for now
          amount: updateAmount,
          status: 'success',
          details: {
            note: remark || `Admin ${type}`,
            adminAction: true,
            type: type,
            txnId: `ADM${Date.now()}`
          }
        }
      ]);

      res.json({ success: true, newBalance });
    } catch (error: any) {
      console.error("Admin Wallet Update Error:", error.message);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

// Admin MPIN Reset Endpoint
app.post("/api/admin/reset-mpin", async (req, res) => {
  const { userId, tempMpin, action } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    let updateData = {};
    if (action === 'reject') {
      updateData = { mpin: null };
    } else {
      if (!tempMpin) {
        return res.status(400).json({ error: "Temporary MPIN is required for reset" });
      }
      updateData = { mpin: `TEMP:${tempMpin}` };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: action === 'reject' ? "Request rejected" : "MPIN reset successful",
      user: data[0]
    });
  } catch (error: any) {
    console.error("MPIN reset error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Admin Process Wallet Request Endpoint
app.post("/api/admin/process-wallet-request", async (req, res) => {
  const { requestId, action, rejectReason } = req.body;

  if (!requestId || !action) {
    return res.status(400).json({ error: "Request ID and action are required" });
  }

  try {
    // 1. Fetch the request
    const { data: request, error: fetchError } = await supabase
      .from('transactions')
      .select('*, profiles:user_id(wallet_balance)')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request already processed" });
    }

    const refNumber = request.details?.refNumber;

    // 2. If approving, check for duplicates and update balance
    if (action === 'approve') {
      // Check for duplicate UTRs already approved
      if (refNumber) {
        const { data: duplicate } = await supabase
          .from('transactions')
          .select('id')
          .eq('type', 'wallet_add')
          .eq('status', 'success')
          .filter('details->>refNumber', 'eq', refNumber)
          .neq('id', requestId)
          .limit(1);

        if (duplicate && duplicate.length > 0) {
          return res.status(400).json({ error: "This Reference Number (UTR) has already been approved!" });
        }
      }

      // Update user balance
      const currentBalance = request.profiles?.wallet_balance || 0;
      const newBalance = currentBalance + request.amount;

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', request.user_id);

      if (balanceError) throw balanceError;

      // Auto-reject other pending requests with same UTR
      if (refNumber) {
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            details: {
              ...request.details,
              autoRejected: true,
              rejectReason: 'Duplicate UTR - Another request approved.',
              processedAt: new Date().toISOString(),
              processedBy: 'system'
            }
          })
          .eq('type', 'wallet_add')
          .eq('status', 'pending')
          .filter('details->>refNumber', 'eq', refNumber)
          .neq('id', requestId);
      }
    }

    // 3. Update transaction status
    const newBalance = action === 'approve' ? (request.profiles?.wallet_balance || 0) + request.amount : request.profiles?.wallet_balance || 0;
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: action === 'approve' ? 'success' : 'failed',
        details: {
          ...(request.details || {}),
          processedAt: new Date().toISOString(),
          processedBy: 'admin',
          rejectReason: action === 'reject' ? rejectReason : null,
          closing_balance: newBalance
        }
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    res.json({ success: true, message: `Request ${action}ed successfully` });
  } catch (error: any) {
    console.error("Process wallet request error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// --- VITE MIDDLEWARE OR STATIC SERVING ---
if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  (async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })();
} else if (process.env.VERCEL !== "1") {
  // Production (Cloud Run)
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  // SPA fallback
  app.get("*", (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
