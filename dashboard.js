const API_BASE_URL = "http://localhost:3000"; // Ganti sesuai URL API Anda

// Fetch and display books
const fetchBooks = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized");

    const response = await fetch(`${API_BASE_URL}/books`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch books");

    const books = await response.json();
    const bookList = document.getElementById("bookList");
    bookList.innerHTML = ""; // Clear existing rows

    books.forEach((book, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${book.id}">Delete</button>
        </td>
      `;
      bookList.appendChild(row);
    });

    // Attach delete event listeners
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", deleteBook);
    });
  } catch (error) {
    console.error(error);
    alert("Error fetching books");
  }
};

// Add a new book
const addBook = async (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const isbn = document.getElementById("isbn").value.trim();
  const category = document.getElementById("category").value.trim();
  const description = document.getElementById("description").value.trim();

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized");

    const response = await fetch(`${API_BASE_URL}/books`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, author, isbn, category, description }),
    });

    if (!response.ok) throw new Error("Failed to add book");

    alert("Book added successfully!");
    document.getElementById("addBookForm").reset();
    fetchBooks(); // Refresh the book list
  } catch (error) {
    console.error(error);
    alert("Error adding book");
  }
};

// Delete a book
const deleteBook = async (event) => {
  const bookId = event.target.dataset.id;

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized");

    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to delete book");

    alert("Book deleted successfully!");
    fetchBooks(); // Refresh the book list
  } catch (error) {
    console.error(error);
    alert("Error deleting book");
  }
};

// Logout
const logout = () => {
  localStorage.removeItem("token");
  alert("Logged out successfully!");
  window.location.href = "/index.html"; // Redirect to login page
};

// Initialize dashboard
const initializeDashboard = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Unauthorized access! Redirecting to login...");
    window.location.href = "/index.html";
    return;
  }

  fetchBooks(); // Load books on page load

  // Attach event listeners
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("addBookForm").addEventListener("submit", addBook);
};

// Run initialization
initializeDashboard();
