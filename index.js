const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());

// ================= CONFIG =================

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// ================= MONGO CLIENT =================

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,

    strict: true,

    deprecationErrors: true,
  },
});

let db;

// ================= DATABASE CONNECT =================

async function connectDB() {
  if (db) return db;

  await client.connect();

  db = client.db("BiblioDrop");

  console.log("✅ MongoDB Connected");

  return db;
}

// ================= HEALTH CHECK =================

app.get("/", (req, res) => {
  res.send("🚀 BiblioDrop Server Running");
});

// ================= SERVER START =================

app.listen(port, async () => {
  await connectDB();

  console.log(`🚀 Server running on port ${port}`);
});
