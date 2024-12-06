// File: app.js

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const multer = require("multer");
const dayjs = require("dayjs");
const path = require("path");



const app = express();
const port = process.env.PORT || 3000;

// JWT Secret Key
const JWT_SECRET = "your-jwt-secret"; // Ganti dengan secret key yang aman

// Database Configuration
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "pepustakaan_buku",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder penyimpanan
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName); // Format nama file
  },
});

const upload = multer({ storage });


// Middleware
app.use(cors({ origin: ["http://127.0.0.1:5500"], credentials: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware: Authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token not found." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: Invalid token." });
    }
    req.user = user;
    next();
  });
};

// Middleware: Authenticate Admin
const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: Admins only." });
  }
  next();
};

// Helper Function: Database Query
const queryDatabase = async (sql, params = []) => {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error("Database query failed:", error);
    throw error;
  }
};


// Routes

// Register User
app.post("/register", async (req, res) => {
  const { username, password, email, nama_lengkap, role, phone_number, address } = req.body;

  // Validasi input
  if (!username || !password || !email || !nama_lengkap || !role || !phone_number || !address) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }

  try {
    // Cek apakah username sudah digunakan
    const existingUser = await queryDatabase("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser.length) {
      return res.status(400).json({ error: "Username already taken." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan pengguna ke database
    await queryDatabase(
      "INSERT INTO users (username, password, email, nama_lengkap, role, phone_number, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email, nama_lengkap, role, phone_number, address]
    );

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const results = await queryDatabase("SELECT * FROM users WHERE username = ?", [username]);
    if (!results.length) {
      return res.status(401).json({ error: "Username not found." });
    }

    const user = results[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ message: "Login successful", token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Routes

// Add Book - Admin Only
app.post("/books", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { title, author, isbn, category, image_url, description } = req.body;
  
    if (!title || !author || !isbn || !category) {
      return res.status(400).json({ error: "Missing required fields." });
    }
  
    try {
      await queryDatabase(
        "INSERT INTO books (title, author, isbn, category, image_url, description) VALUES (?, ?, ?, ?, ?, ?)",
        [title, author, isbn, category, image_url || null, description || null]
      );
      res.status(201).json({ message: "Book added successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Update Book - Admin Only
  app.put("/books/:id", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, author, isbn, category, image_url, description } = req.body;
  
    if (!title || !author || !isbn || !category) {
      return res.status(400).json({ error: "Missing required fields." });
    }
  
    try {
      const result = await queryDatabase(
        "UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, image_url = ?, description = ? WHERE id = ?",
        [title, author, isbn, category, image_url || null, description || null, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Book not found." });
      }
      res.json({ message: "Book updated successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
// Get All Users - Admin Only
app.get("/users", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Pagination parameters
    const offset = (page - 1) * limit;
  
    try {
      // Fetch users with pagination
      const users = await queryDatabase(
        "SELECT id, username, email, nama_lengkap, role FROM users LIMIT ? OFFSET ?",
        [parseInt(limit), offset]
      );
  
      // Get total user count
      const totalUsers = await queryDatabase("SELECT COUNT(*) AS count FROM users");
      const total = totalUsers[0]?.count || 0;
  
      res.json({
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });  

  // Delete Book - Admin Only
  app.delete("/books/:id", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await queryDatabase("DELETE FROM books WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Book not found." });
      }
      res.json({ message: "Book deleted successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Get All Books with Pagination
  app.get("/books", authenticateJWT, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
  
    try {
      const books = await queryDatabase("SELECT * FROM books LIMIT ? OFFSET ?", [parseInt(limit), offset]);
      const totalBooks = await queryDatabase("SELECT COUNT(*) AS count FROM books");
      const total = totalBooks[0]?.count || 0;
  
      res.json({
        books,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
// Get Loans - User or Admin Specific
app.get("/loans", authenticateJWT, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Validasi input page dan limit
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    if (isNaN(pageInt) || isNaN(limitInt) || pageInt < 1 || limitInt < 1) {
      return res.status(400).json({ error: "Invalid page or limit parameter." });
    }

    if (req.user.role === "admin") {
      // Query untuk admin: Ambil semua pinjaman
      const loans = await queryDatabase(
        `SELECT l.id, l.book_id, b.title AS book_title, 
                    u.nama_lengkap AS borrower_name, l.location, 
                    l.loan_date, l.return_date, l.delay_days, 
                    l.is_returned, l.returned_at 
         FROM loans l
         JOIN books b ON l.book_id = b.id
         JOIN users u ON l.user_id = u.id
         LIMIT ? OFFSET ?`,
        [limitInt, offset]
      );

      // Format tanggal
      const formattedLoans = loans.map(loan => ({
        ...loan,
        loan_date: dayjs(loan.loan_date).format("DD MMMM YYYY"), // Format tanggal pinjam
        return_date: loan.return_date
          ? dayjs(loan.return_date).format("DD MMMM YYYY") // Format tanggal kembali
          : "Belum Dikembalikan", // Jika belum dikembalikan
        created_at: dayjs(loan.created_at).format("DD MMMM YYYY HH:mm"), // Format waktu dibuat
      }));

      // Hitung total pinjaman
      const totalLoans = await queryDatabase("SELECT COUNT(*) AS count FROM loans");
      const total = totalLoans[0]?.count || 0;

      return res.json({
        loans: formattedLoans,
        total,
        page: pageInt,
        pages: Math.ceil(total / limitInt),
      });
    } else {
      // Query untuk pengguna biasa: hanya ambil pinjaman miliknya
      const userId = req.user.id;

      const loans = await queryDatabase(
        `SELECT l.id, l.book_id, b.title AS book_title, 
                l.location, l.loan_date, l.return_date, l.created_at 
         FROM loans l
         JOIN books b ON l.book_id = b.id
         WHERE l.user_id = ?
         LIMIT ? OFFSET ?`,
        [userId, limitInt, offset]
      );

      // Format tanggal
      const formattedLoans = loans.map(loan => ({
        ...loan,
        loan_date: dayjs(loan.loan_date).format("DD MMMM YYYY"),
        return_date: loan.return_date
          ? dayjs(loan.return_date).format("DD MMMM YYYY")
          : "Belum Dikembalikan",
        created_at: dayjs(loan.created_at).format("DD MMMM YYYY HH:mm"),
      }));

      // Hitung total pinjaman untuk pengguna ini
      const totalLoans = await queryDatabase(
        "SELECT COUNT(*) AS count FROM loans WHERE user_id = ?",
        [userId]
      );
      const total = totalLoans[0]?.count || 0;

      return res.json({
        loans: formattedLoans,
        total,
        page: pageInt,
        pages: Math.ceil(total / limitInt),
      });
    }
  } catch (error) {
    console.error("Error fetching loans:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
  
  

  // Search Books
  app.get("/books/search", authenticateJWT, async (req, res) => {
    const { q } = req.query;
  
    if (!q) {
      return res.status(400).json({ error: "Search query is required." });
    }
  
    try {
      const books = await queryDatabase(
        `SELECT * FROM books 
         WHERE title LIKE ? OR author LIKE ? OR category LIKE ?`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
  
      res.json({ books });
    } catch (error) {
      console.error("Error searching books:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Post Loan - User Only
  app.post("/loans", authenticateJWT, async (req, res) => {
    if (req.user.role !== "user") {
        return res.status(403).json({ error: "Access denied: Users only." });
    }

    const { book_id, borrower_name, location, loan_date, return_date } = req.body;

    if (!book_id || !borrower_name || !location || !loan_date || !return_date) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        // Validasi tanggal
        const today = new Date();
        const loanDate = new Date(loan_date);
        const returnDate = new Date(return_date);

        // Validasi: Maksimal peminjaman adalah 14 hari
        const maxLoanPeriod = 14; // Maksimal 14 hari
        const maxReturnDate = new Date(loanDate);
        maxReturnDate.setDate(maxReturnDate.getDate() + maxLoanPeriod);

        if (returnDate > maxReturnDate) {
            return res.status(400).json({ error: `Return date cannot exceed 14 days from loan date. Maximum return date: ${maxReturnDate.toISOString().split("T")[0]}` });
        }

        if (loanDate < today) {
            return res.status(400).json({ error: "Loan date cannot be in the past." });
        }

        if (returnDate <= loanDate) {
            return res.status(400).json({ error: "Return date must be after the loan date." });
        }

        // Cek apakah buku tersedia
        const [book] = await queryDatabase("SELECT availability FROM books WHERE id = ?", [book_id]);

        if (!book) {
            return res.status(404).json({ error: "Book not found." });
        }

        if (!book.availability) {
            return res.status(400).json({ error: "Book is not available." });
        }

        // Cek apakah pengguna sudah meminjam buku ini sebelumnya
        const [existingLoan] = await queryDatabase(
            "SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND is_returned = 0",
            [req.user.id, book_id]
        );

        if (existingLoan) {
            return res.status(400).json({ error: "You already have an active loan for this book." });
        }

        // Tandai buku sebagai tidak tersedia
        await queryDatabase("UPDATE books SET availability = 0 WHERE id = ?", [book_id]);

        // Buat peminjaman
        await queryDatabase(
            `INSERT INTO loans (user_id, book_id, borrower_name, location, loan_date, return_date, created_at, is_returned) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
            [req.user.id, book_id, borrower_name, location, loan_date, return_date]
        );

        res.status(201).json({ message: "Loan created successfully!" });
    } catch (error) {
        console.error("Error creating loan:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/loans/history", authenticateJWT, async (req, res) => {
    try {
        const loans = await queryDatabase(
            "SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        res.status(200).json({ loans });
    } catch (error) {
        console.error("Error fetching loan history:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/returns", authenticateJWT, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ error: "Access denied: Users only." });
  }

  const { loan_id } = req.body;

  if (!loan_id) {
    return res.status(400).json({ error: "Loan ID is required." });
  }

  try {
    // Ambil detail peminjaman
    const [loan] = await queryDatabase(
      "SELECT book_id, return_date, returned_at, is_returned FROM loans WHERE id = ?",
      [loan_id]
    );

    if (!loan) {
      return res.status(404).json({ error: "Loan not found." });
    }

    if (loan.is_returned) {
      return res.status(400).json({ error: "Book has already been returned." });
    }

    // Calculate delay and fine
    const today = new Date();
    const returnDate = new Date(loan.return_date);
    const delayDays = today > returnDate ? Math.ceil((today - returnDate) / (1000 * 60 * 60 * 24)) : 0;
    const fineAmount = delayDays * 5000;

    if (today > returnDate) {
      delayDays = Math.ceil((today - returnDate) / (1000 * 60 * 60 * 24));
      fine = delayDays * 5000; // Hitung denda (5000 per hari keterlambatan)
    }

    // Tandai buku sebagai "dikembalikan"
    await queryDatabase("UPDATE books SET availability = 1 WHERE id = ?", [loan.book_id]);

    // Tandai buku dikembalikan, simpan keterlambatan dan denda
    await queryDatabase(
      "UPDATE loans SET returned_at = NOW(), is_returned = 1, delay_days = ?, fine_amount = ? WHERE id = ?",
      [delayDays, fineAmount, loan_id]
    );

    res.status(200).json({
      message: delayDays > 0
        ? `Book returned successfully, but you are ${delayDays} days late. Total fine: Rp ${fine}.`
        : "Book returned successfully!",
      fine: fineAmount,
    });
  } catch (error) {
    console.error("Error returning book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/loans/fines", authenticateJWT, async (req, res) => {
  try {
    // Ambil semua pinjaman pengguna yang memiliki keterlambatan
    const fines = await queryDatabase(
      `SELECT 
        l.id, 
        b.title AS book_title, 
        l.borrower_name, 
        l.location, 
        DATE_FORMAT(l.loan_date, '%Y-%m-%d') AS loan_date, 
        DATE_FORMAT(l.return_date, '%Y-%m-%d') AS return_date, 
        l.delay_days, 
        l.fine_amount 
       FROM loans l
       JOIN books b ON l.book_id = b.id
       WHERE l.user_id = ? AND l.delay_days > 0`,
      [req.user.id]
    );

    res.status(200).json(fines);
  } catch (error) {
    console.error("Error fetching fines:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route: Update User Profile
app.post("/users/me", authenticateJWT, upload.single("profile_image"), async (req, res) => {
  const { nama_lengkap, email } = req.body;

  if (!nama_lengkap || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  try {
    const updates = { nama_lengkap, email };

    // Periksa apakah ada file gambar yang diunggah
    if (req.file) {
      updates.profile_image = `/uploads/${req.file.filename}`;
    }

    // Update database
    await queryDatabase(
      "UPDATE users SET nama_lengkap = ?, email = ?, profile_image = ? WHERE id = ?",
      [
        updates.nama_lengkap,
        updates.email,
        updates.profile_image || req.user.profile_image, // Gunakan gambar lama jika tidak ada unggahan baru
        req.user.id,
      ]
    );

    // Ambil data terbaru pengguna
    const [updatedUser] = await queryDatabase(
      "SELECT id, nama_lengkap, email, profile_image FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(updatedUser); // Kirim data terbaru ke frontend
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/users/me", authenticateJWT, async (req, res) => {
  try {
    // Ambil data pengguna termasuk nomor telepon dan alamat
    const [user] = await queryDatabase(
      `SELECT nama_lengkap, email, phone_number, address, profile_image 
       FROM users 
       WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      phone_number: user.phone_number,
      address: user.address,
      profile_image: `${req.protocol}://${req.get("host")}${user.profile_image || "/uploads/default.png"}`, // Path lengkap
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route: Change Password
app.post("/users/change-password", authenticateJWT, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Current and new password are required." });
  }

  try {
    const [user] = await queryDatabase("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isPasswordMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    const result = await queryDatabase("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Failed to update password." });
    }

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

  // Endpoint Statistik Buku
  app.get("/books/stats", authenticateJWT, authenticateAdmin, async (req, res) => {
    try {
      const [totalBooks] = await queryDatabase("SELECT COUNT(*) AS total FROM books");
      res.json({ total: totalBooks.total });
    } catch (error) {
      console.error("Error fetching book stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Endpoint Statistik Pengguna
  app.get("/users/stats", authenticateJWT, authenticateAdmin, async (req, res) => {
    try {
      const [totalUsers] = await queryDatabase("SELECT COUNT(*) AS total FROM users");
      res.json({ total: totalUsers.total });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Endpoint Statistik Pinjaman
  app.get("/loans/stats", authenticateJWT, authenticateAdmin, async (req, res) => {
    try {
      const [activeLoans] = await queryDatabase(
        "SELECT COUNT(*) AS total FROM loans WHERE is_returned = 0"
      );
      res.json({ active: activeLoans.total });
    } catch (error) {
      console.error("Error fetching loan stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.put("/books/:id", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, author, isbn, category, image_url, description } = req.body;
  
    if (!title || !author || !isbn || !category) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
    try {
      const result = await queryDatabase(
        "UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, image_url = ?, description = ? WHERE id = ?",
        [title, author, isbn, category, image_url || null, description || null, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Book not found." });
      }
  
      res.json({ message: "Book updated successfully!" });
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  app.get("/books/:id", authenticateJWT, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      const [book] = await queryDatabase("SELECT * FROM books WHERE id = ?", [id]);
      if (!book) {
        return res.status(404).json({ error: "Book not found." });
      }
      res.json(book);
    } catch (error) {
      console.error("Error fetching book details:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Route: Reset Password
  app.post("/users/reset-password", authenticateJWT, async (req, res) => {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    try {
      // Check if user exists
      const [user] = await queryDatabase("SELECT id FROM users WHERE username = ?", [username]);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Hash the new password (using the username as the new password)
      const newPassword = await bcrypt.hash(username, 10);

      // Update the password in the database
      const result = await queryDatabase("UPDATE users SET password = ? WHERE username = ?", [
        newPassword,
        username,
      ]);

      if (result.affectedRows === 0) {
        return res.status(500).json({ error: "Failed to reset password." });
      }

      res.json({ message: `Password for user '${username}' has been reset to their username.` });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  //delete user(admin)
  app.delete("/users/:id", authenticateJWT, authenticateAdmin, async (req, res) => {
    const userId = req.params.id;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Pastikan admin tidak menghapus dirinya sendiri
        if (req.user.id === parseInt(userId)) {
            return res.status(400).json({ error: "You cannot delete your own account." });
        }

        // Hapus pengguna
        const result = await queryDatabase("DELETE FROM users WHERE id = ?", [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({ message: "User deleted successfully!" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start Server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
