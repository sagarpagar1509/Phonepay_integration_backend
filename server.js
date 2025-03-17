require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors({ origin: "https://phonepay-integration.vercel.app/" })); // Allow frontend requests

// const PHONEPE_AUTH_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
// const PHONEPE_PAYMENT_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay";
// const PHONEPE_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order";

// production Api
const PHONEPE_AUTH_URL = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
const PHONEPE_PAYMENT_URL = "https://api.phonepe.com/apis/pg/checkout/v2/pay";
const PHONEPE_STATUS_URL = "https://api.phonepe.com/apis/pg";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = "https://yourwebsite.com/payment-success";

let accessToken = null;

// ✅ API to Get Authorization Token
app.post("/api/get-token", async (req, res) => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: "Missing CLIENT_ID or CLIENT_SECRET" });
    }

    try {
        const response = await axios.post(
            PHONEPE_AUTH_URL,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_version: "1",
                client_secret: CLIENT_SECRET,
                grant_type: "client_credentials",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        accessToken = response.data.access_token;
        res.json({ access_token: accessToken });
    } catch (error) {
        console.error("❌ Error fetching Auth Token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Auth Token" });
    }
});

// ✅ API to Initiate Payment

app.post("/api/initiate-payment", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]; // ✅ Extract token properly

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Missing Token" });
    }

    try {
        const paymentData = req.body; // Get payment data from frontend

        const response = await axios.post(PHONEPE_PAYMENT_URL, paymentData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `O-Bearer ${token}`, // ✅ Send token in headers
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error("❌ Payment API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Payment request failed" });
    }
});


// ✅ API to Check Payment Status
app.get("/api/check-status/:merchantOrderId", async (req, res) => {
    if (!accessToken) return res.status(401).json({ error: "Unauthorized: Get access token first" });

    try {
        const response = await axios.get(`${PHONEPE_STATUS_URL}/${req.params.merchantOrderId}/status`, {
            headers: { 
                "Content-Type": "application/json", 
                Authorization: `O-Bearer ${accessToken}`, // ✅ Using "O-Bearer" consistently
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error("❌ Status Check Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to check payment status" });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
