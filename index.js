const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();

app.use(cors());

app.use(express.json());

const port = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

let booksCollection;

async function connectDB() {
  if (db) return db;

  await client.connect();

  db = client.db("local-book-shop");

  booksCollection = db.collection("books");

  console.log("✅ MongoDB Connected");

  return db;
}

// HEALTH CHECK

app.get("/", (req, res) => {
  res.send("🚀 BiblioDrop Server Running");
});

// ==============================
// LIBRARIAN ROUTE
// ==============================
// ADD BOOK
app.post(
  "/librarian/addbooks",

  async (req, res) => {
    try {
      const book = req.body;

      const newBook = {
        ...book,

        status: "Pending Approval",

        createdAt: new Date(),
      };

      const result = await booksCollection.insertOne(newBook);
      res.status(201).send({
        success: true,

        insertedId: result.insertedId,

        message: "Book added successfully",
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        success: false,

        message: "Failed to add book",
      });
    }
  },
);

// GET BOOKS
app.get(
  "/librarian/books",

  async (req, res) => {
    try {
      const result = await booksCollection.find().toArray();

      res.send(result);
    } catch (error) {
      res.status(500).send({
        success: false,

        message: "Failed to fetch books",
      });
    }
  },
);

// UPDATE BOOK STATUS
app.patch(
  "/librarian/books/:id",

  async (req, res) => {
    try {
      const id = req.params.id;

      const { status } = req.body;


      const result = await booksCollection.updateOne(

        {
          _id: new ObjectId(id),
        },

        {
          $set:{
            status
          }
        }

      );


      res.send({

        success:true,

        result

      });


    } catch(error){

      console.log(error);


      res.status(500).send({

        success:false,

        message:"Status update failed"

      });

    }

  }
);

// SERVER STUTAS
app.listen(port, async () => {
  await connectDB();

  console.log(`🚀 Server running on port ${port}`);
});
