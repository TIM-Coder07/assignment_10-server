const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require("mongodb");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

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
let deliveryCollection;
let reviewsCollection;
let usersCollection;

async function connectDB() {
  if (db) return db;

  await client.connect();

  db = client.db("local-book-shop");

  booksCollection = db.collection("books");
  deliveryCollection = db.collection("deliveries");
  reviewsCollection = db.collection("reviews");
  usersCollection = db.collection("users");

  console.log("✅ MongoDB Connected");

  return db;
}

// HEALTH CHECK
app.get("/", (req, res) => {
  res.send("🚀 BiblioDrop Server Running");
});

// GET BROWSE BOOOK
app.get("/books", async (req, res) => {
  const books = await booksCollection
    .find({
      status: "Published",
    })
    .toArray();

  res.send(books);
});

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

// Published Browse Books API
app.get("/books", async (req, res) => {
  try {
    const books = await booksCollection
      .find({
        status: "Published",
      })
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

// ==============================
// ADMIN ROUTE
// ==============================
// Admin OverView Route
app.get("/admin/overview", async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();

    const totalBooks = await booksCollection.countDocuments();

    const totalDeliveries = await deliveryCollection.countDocuments();

    const deliveredOrders = await deliveryCollection
      .find({
        status: "Delivered",
      })
      .toArray();

    const totalRevenue = deliveredOrders.reduce(
      (sum, item) => sum + Number(item.deliveryFee || 0),
      0,
    );

    const booksByCategory = await booksCollection
      .aggregate([
        {
          $group: {
            _id: "$category",
            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

    res.send({
      totalUsers,
      totalBooks,
      totalDeliveries,
      totalRevenue,

      booksByCategory: booksByCategory.map((item) => ({
        category: item._id,
        count: item.count,
      })),
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to load admin overview",
    });
  }
});

// Get All Pending Books
app.get("/admin/pending-books", async (req, res) => {
  try {
    const books = await booksCollection
      .find({
        status: "Pending Approval",
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch pending books",
    });
  }
});

// Approve Book
app.patch("/admin/books/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await booksCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "Published",
          approvedAt: new Date(),
        },
      },
    );

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Book approved successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Approval failed",
    });
  }
});

// Admin Reject Book
app.patch("/admin/books/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await booksCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "Rejected",
          rejectedAt: new Date(),
        },
      },
    );

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Book rejected",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Reject failed",
    });
  }
});

// Admin Delete
app.delete("/admin/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await booksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Delete failed",
    });
  }
});

// Get All Users by ADMIN
app.get("/admin/users", async (req, res) => {
  try {
    const users = await usersCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(users);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// Change User Role by ADMIN
app.patch("/admin/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;

    const { role } = req.body;

    const allowedRoles = ["User", "Librarian", "Admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).send({
        success: false,
        message: "Invalid role",
      });
    }

    const result = await usersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Role updated successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to update role",
    });
  }
});

// Delete User by ADMIN
app.delete("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await usersCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to delete user",
    });
  }
});


// ==============================
// LIBRARIAN ROUTE
// ==============================

// ADD BOOK
app.post("/librarian/addbooks", async (req, res) => {
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
      message: "Book submitted for admin approval",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to add book",
    });
  }
});

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

// Librarian My Books
app.get("/librarian/books/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const books = await booksCollection
      .find({
        librarianEmail: email,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(books);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

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
app.patch("/librarian/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedBook = req.body;

    // Prevent librarian from changing approval fields
    updatedBook.status = "Pending Approval";
    delete updatedBook.status;
    delete updatedBook.approvedAt;
    delete updatedBook.rejectedAt;

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
    res.status(500).send({
      success: false,
      message: "Update failed",
    });
  }
});

//Librarian OverView Route
app.get("/librarian/overview/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Total Books Listed
    const totalBooksListed = await booksCollection.countDocuments({
      librarianEmail: email,
    });

    // All deliveries of this librarian
    const deliveries = await deliveryCollection
      .find({
        librarianEmail: email,
      })
      .toArray();

    // Total Earnings
    const totalEarnings = deliveries
      .filter((item) => item.status === "Delivered")
      .reduce((sum, item) => sum + Number(item.deliveryFee || 0), 0);

    // Pending Requests
    const activePendingRequests = deliveries.filter(
      (item) => item.status === "Pending",
    ).length;

    // Most Requested Books
    const mostRequestedBooks = await deliveryCollection
      .aggregate([
        {
          $match: {
            librarianEmail: email,
          },
        },
        {
          $group: {
            _id: "$bookTitle",
            requestCount: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            requestCount: -1,
          },
        },
        {
          $limit: 5,
        },
      ])
      .toArray();

    // Chart Data
    const chartData = mostRequestedBooks.map((book) => ({
      title: book._id,
      requests: book.requestCount,
    }));

    res.send({
      totalBooksListed,
      totalEarnings,
      activePendingRequests,
      mostRequestedBooks,
      chartData,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to load overview data",
    });
  }
});

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
    console.log("INSERT RESULT:", result);

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

// User ReadList
app.get("/deliveries/user/:email/delivered", async (req, res) => {
  const email = req.params.email;

  const result = await deliveryCollection
    .find({
      userEmail: email,
      status: "Delivered",
    })
    .toArray();

  res.send(result);
});

// USER REVIEW API's
// ------------------------------------
// User OverView Route
app.get("/user/overview/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const deliveries = await deliveryCollection
      .find({
        userEmail: email,
      })
      .toArray();

    // Total Books Read
    const totalBooksRead = deliveries.filter(
      (item) => item.status === "Delivered",
    ).length;

    // Pending Deliveries
    const pendingDeliveries = deliveries.filter(
      (item) => item.status === "Pending",
    ).length;

    // Total Spent on Fees
    const totalSpent = deliveries.reduce(
      (sum, item) => sum + Number(item.deliveryFee || 0),
      0,
    );

    // Chart Data (Books by Status)
    const chartData = [
      {
        month: "Delivered",
        books: totalBooksRead,
      },
      {
        month: "Pending",
        books: pendingDeliveries,
      },
      {
        month: "Total Requests",
        books: deliveries.length,
      },
    ];

    res.send({
      totalBooksRead,
      pendingDeliveries,
      totalSpent,
      chartData,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to load user overview",
    });
  }
});

// Get Review's
app.get("/reviews/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    const result = await reviewsCollection
      .find({ bookId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

// POST Review's
app.post("/reviews", async (req, res) => {
  try {
    const review = req.body;

    const { bookId, userEmail } = review;

    // Verify delivered book
    const deliveredBook = await deliveryCollection.findOne({
      bookId,
      userEmail,
      status: "Delivered",
    });

    if (!deliveredBook) {
      return res.status(403).send({
        success: false,
        message: "Only delivered books can be reviewed",
      });
    }

    // Prevent duplicate review
    const existingReview = await reviewsCollection.findOne({
      bookId,
      userEmail,
    });

    if (existingReview) {
      return res.status(400).send({
        success: false,
        message: "You already reviewed this book",
      });
    }

    review.createdAt = new Date();
    review.updatedAt = new Date();

    const result = await reviewsCollection.insertOne(review);

    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Get My Reviews
app.get("/my-reviews/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await reviewsCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update Review
app.patch("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rating, comment } = req.body;

    const result = await reviewsCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          rating,
          comment,
          updatedAt: new Date(),
        },
      },
    );

    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete Review
app.delete("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await reviewsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

// SERVER STUTAS
app.listen(port, async () => {
  await connectDB();

  console.log(`🚀 Server running on port ${port}`);
});
