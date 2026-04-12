import dotenv from "dotenv";
dotenv.config();

export const config = {
  quickbooks: {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || "",
    environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox",
  },
  xero: {
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUri: process.env.XERO_REDIRECT_URI || "",
  },
};

export default config;
