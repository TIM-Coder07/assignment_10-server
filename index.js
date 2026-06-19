require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("BiblioDrop Server Running");
});

app.listen(process.env.PORT, () => {
  console.log(`Server Running`);
});