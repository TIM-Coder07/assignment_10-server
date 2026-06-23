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

// GET BROWSE BOOOK

// GET SINGLE BOOK DETAILS
app.get("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,

        message: "Invalid book id",
      });
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).send({
        success: false,

        message: "Book not found",
      });
    }

    res.send({
      success: true,

      book,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,

      message: "Failed to fetch book details",
    });
  }
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
  "/librarian/books/:id/status",

  async (req, res) => {
    try {
      const id = req.params.id;

      const { status } = req.body;

      const result = await booksCollection.updateOne(
        {
          _id: new ObjectId(id),
        },

        {
          $set: {
            status,
          },
        },
      );

      res.send({
        success: true,

        result,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        success: false,

        message: "Status update failed",
      });
    }
  },
);

// DELETE BOOK
app.delete(
  "/librarian/books/:id",

  async (req, res) => {
    try {
      const id = req.params.id;

      const result = await booksCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send({
        success: true,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        success: false,
        message: "Delete failed",
      });
    }
  },
);

// EDIT API
app.patch(
  "/librarian/books/:id",

  async (req, res) => {
    try {
      const id = req.params.id;

      const updatedBook = req.body;

      const result = await booksCollection.updateOne(
        {
          _id: new ObjectId(id),
        },

        {
          $set: updatedBook,
        },
      );

      res.send({
        success: true,

        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        success: false,

        message: "Update failed",
      });
    }
  },
);

// DELIVERY STUTAS API'S
// Controller:
app.get("/deliveries/librarian/:email", async (req, res) => {
  const email = req.params.email;

  const result = await deliveryCollection
    .find({
      librarianEmail: email,
    })
    .toArray();

  res.send(result);
});

// CREATE DELIVERY REQUEST
app.post("/deliveries", async (req, res) => {
  try {
    const deliveryData = req.body;

    const result = await deliveryCollection.insertOne(deliveryData);

    res.send({
      success: true,

      message: "Delivery request created",

      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,

      message: "Failed to create delivery request",
    });
  }
});

// Status Update API
app.patch("/deliveries/:id/status", async (req, res) => {
  try {
    const id = req.params.id;

    const { status } = req.body;

    const result = await deliveryCollection.updateOne(
      {
        _id: new ObjectId(id),
      },

      {
        $set: {
          status: status,
        },
      },
    );

    res.send({
      success: true,

      result,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,

      message: "Status update failed",
    });
  }
});

// User delivery history API:
app.get("/deliveries/user/:email", async (req, res) => {
  const email = req.params.email;

  const result = await deliveryCollection
    .find({
      userEmail: email,
    })
    .toArray();

  res.send(result);
});

// SERVER STUTAS
app.listen(port, async () => {
  await connectDB();

  console.log(`🚀 Server running on port ${port}`);
});
