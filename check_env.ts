import * as dotenv from 'dotenv';
dotenv.config();
console.log("Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not Set");
