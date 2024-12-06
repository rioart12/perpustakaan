const API_BASE_URL = "http://localhost:3000"; // API URL
const token = localStorage.getItem("token"); // Ambil token dari localStorage
const showToast = (message, type = "success") => {
const toastContainer = document.getElementById("toastContainer");

  // Buat elemen toast
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  // Konten dalam toast
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  // Tambahkan toast ke dalam container
  toastContainer.appendChild(toast);

  // Tampilkan toast menggunakan Bootstrap
  const bootstrapToast = new bootstrap.Toast(toast);
  bootstrapToast.show();

  // Hapus elemen toast setelah selesai
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
};

// Cek token untuk memastikan admin telah login
if (!token) {
  alert("Unauthorized! Redirecting to login...");
  window.location.href = "/index.html";
}

// Logout Function
const logout = () => {
  localStorage.removeItem("token"); // Hapus token dari localStorage
  alert("You have been logged out successfully.");
  window.location.href = "/index.html"; // Redirect ke halaman login
};

// Attach logout function ke tombol logout
document.getElementById("logoutButton").addEventListener("click", logout);

// Fetch Statistik Dashboard
const loadStatistics = async () => {
  try {
    const [booksRes, usersRes, loansRes] = await Promise.all([
      fetch(`${API_BASE_URL}/books/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/users/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/loans/stats`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const books = await booksRes.json();
    const users = await usersRes.json();
    const loans = await loansRes.json();

    // Tampilkan statistik di dashboard
    document.getElementById("totalBooks").textContent = books.total;
    document.getElementById("totalUsers").textContent = users.total;
    document.getElementById("activeLoans").textContent = loans.active;
  } catch (error) {
    console.error("Error loading statistics:", error);
  }
};

// Add Book Handler
document.getElementById("addBookForm").addEventListener("submit", async (event) => {
  event.preventDefault(); // Cegah halaman reload

  // Ambil nilai dari form
  const title = document.getElementById("bookTitle").value;
  const author = document.getElementById("bookAuthor").value;
  const isbn = document.getElementById("bookISBN").value;
  const category = document.getElementById("bookCategory").value;
  const image_url = document.getElementById("bookImageUrl").value;
  const description = document.getElementById("bookDescription").value;

  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, author, isbn, category, image_url, description }),
    });

    if (response.ok) {
      showToast("Book added successfully!");
      document.getElementById("addBookForm").reset(); // Reset form input
      fetchBooks(); // Refresh daftar buku
    } else {
      const data = await response.json();
      showToast(`Failed to add book: ${data.error}`);
    }
  } catch (error) {
    console.error("Error adding book:", error);
    showToast("An error occurred. Please try again.");
  }
});

// Fetch and Display Books
const fetchBooks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/books`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const booksTable = document.getElementById("booksTable");
      booksTable.innerHTML = ""; // Clear existing rows

      data.books.forEach((book, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${book.title}</td>
          <td>${book.author}</td>
          <td>${book.category}</td>
          <td>
            ${book.image_url ? `<img src="${book.image_url}" alt="${book.title}" class="img-thumbnail" style="width: 80px;">` : "No Image"}
          </td>
          <td>${book.availability ? "Available" : "Not Available"}</td>
          <td>
            <button class="btn btn-primary btn-sm edit-btn" data-id="${book.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${book.id}">Delete</button>
          </td>
        `;
        booksTable.appendChild(row);
      });

      // Attach event listeners to tombol delete
      document.querySelectorAll(".delete-btn").forEach((btn) =>
        btn.addEventListener("click", deleteBook)
      );
    } else {
      showToast("Failed to fetch books.");
    }
  } catch (error) {
    console.error("Error fetching books:", error);
    showToast("An error occurred while fetching books.");
  }
};

// Delete Book Handler
const deleteBook = async (event) => {
  const bookId = event.target.dataset.id;

  try {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      showToast("Book deleted successfully!");
      fetchBooks(); // Refresh daftar buku
    } else {
      showToast("Failed to delete book.");
    }
  } catch (error) {
    console.error("Error deleting book:", error);
    showToast("An error occurred. Please try again.");
  }
};

// Fetch and Display Loans
const fetchLoans = async (page = 1, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/loans?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const loansTable = document.getElementById("loansTable");
      loansTable.innerHTML = ""; // Clear existing rows

      data.loans.forEach((loan, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${(page - 1) * limit + index + 1}</td>
          <td>${loan.borrower_name}</td>
          <td>${loan.book_title}</td>
          <td>${loan.location}</td>
          <td>${loan.loan_date}</td>
          <td>${loan.return_date}</td>
          <td>${loan.created_at}</td>
          <td>
              <span class="badge ${loan.is_returned ? 'bg-success' : 'bg-danger'}">
                  ${loan.is_returned ? "Returned" : "Not Returned"}
              </span>
          </td>
          <td>
              ${loan.is_returned ? loan.returned_at : `<button class="btn btn-warning btn-sm return-loan" data-id="${loan.id}">Mark as Returned</button>`}
          </td>
        `;
        loansTable.appendChild(row);
      });

      // Tandai pinjaman sebagai dikembalikan
      document.addEventListener("click", async (event) => {
        if (event.target.classList.contains("return-loan")) {
            const loanId = event.target.dataset.id;

            if (confirm("Mark this loan as returned?")) {
                try {
                    const response = await fetch(`${API_BASE_URL}/returns`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ loan_id: loanId }),
                    });

                    if (response.ok) {
                        showToast("Loan marked as returned successfully!", "success");
                        fetchLoans(); // Refresh daftar pinjaman
                    } else {
                        const error = await response.json();
                        showToast(`Failed to mark loan as returned: ${error.error}`, "danger");
                    }
                } catch (error) {
                    console.error("Error marking loan as returned:", error);
                    showToast("An error occurred. Please try again.", "danger");
                }
            }
        }
      });


      // Setup pagination
      setupPagination(data.page, data.pages, fetchLoans, "loansPagination");
    } else {
      const error = await response.json();
      showToast(`Failed to fetch loans: ${error.error}`);
    }
  } catch (error) {
    console.error("Error fetching loans:", error);
    showToast("An error occurred while fetching loans.");
  }
};

// Fetch and Display Users
const fetchUsers = async (page = 1, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const usersTable = document.getElementById("usersTable");
      usersTable.innerHTML = ""; // Clear existing rows

      data.users.forEach((user, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${(page - 1) * limit + index + 1}</td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.nama_lengkap}</td>
          <td>${user.role}</td>
          <td>
          <button class="btn btn-danger btn-sm delete-user" data-id="${user.id}">
            Delete
          </button>
        </td>
        `;
        usersTable.appendChild(row);
      });

      // Tambahkan event listener untuk tombol Delete
      document.querySelectorAll(".delete-user").forEach((button) =>
        button.addEventListener("click", async (event) => {
          const userId = event.target.dataset.id;

          if (confirm("Are you sure you want to delete this user?")) {
            try {
              const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                showToast("User deleted successfully!", "success");
                fetchUsers(); // Refresh daftar pengguna
              } else {
                const error = await response.json();
                showToast(`Failed to delete user: ${error.error}`, "danger");
              }
            } catch (error) {
              console.error("Error deleting user:", error);
              showToast("An error occurred. Please try again.", "danger");
            }
          }
        })
      );

      // Setup pagination
      setupPagination(data.page, data.pages, fetchUsers, "usersPagination");
    } else {
      const error = await response.json();
      showToast(`Failed to fetch users: ${error.error}`);
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    showToast("An error occurred while fetching users.");
  }
};

// Setup Pagination
const setupPagination = (currentPage, totalPages, callback, containerId) => {
  const paginationContainer = document.getElementById(containerId);
  paginationContainer.innerHTML = ""; // Clear existing pagination

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.className = `btn btn-sm ${i === currentPage ? "btn-primary" : "btn-secondary"}`;
    pageButton.textContent = i;
    pageButton.onclick = () => callback(i); // Ambil data untuk halaman yang dipilih
    paginationContainer.appendChild(pageButton);
  }
};

// Handle tombol Edit
document.addEventListener("click", (event) => {
    if (event.target.classList.contains("edit-btn")) {
      const bookId = event.target.dataset.id;
  
      // Fetch data buku berdasarkan ID
      fetch(`${API_BASE_URL}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((data) => {
          // Isi modal dengan data buku
          document.getElementById("editBookId").value = bookId;
          document.getElementById("editBookTitle").value = data.title;
          document.getElementById("editBookAuthor").value = data.author;
          document.getElementById("editBookCategory").value = data.category;
          document.getElementById("editBookISBN").value = data.isbn;
          document.getElementById("editBookImageUrl").value = data.image_url || "";
          document.getElementById("editBookDescription").value = data.description || "";
  
          // Tampilkan modal
          const editBookModal = new bootstrap.Modal(document.getElementById("editBookModal"));
          editBookModal.show();
        })
        .catch((error) => {
          console.error("Error fetching book details:", error);
          showToast("Failed to fetch book details.");
        });
    }
  });
  // Handle submit form Edit Buku
    document.getElementById("editBookForm").addEventListener("submit", async (event) => {
        event.preventDefault(); // Cegah halaman reload
    
        const bookId = document.getElementById("editBookId").value;
        const title = document.getElementById("editBookTitle").value;
        const author = document.getElementById("editBookAuthor").value;
        const category = document.getElementById("editBookCategory").value;
        const isbn = document.getElementById("editBookISBN").value;
        const image_url = document.getElementById("editBookImageUrl").value;
        const description = document.getElementById("editBookDescription").value;
    
        try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title, author, isbn, category, image_url, description }),
        });
    
        if (response.ok) {
            alert("Book updated successfully!");
            const editBookModal = bootstrap.Modal.getInstance(document.getElementById("editBookModal"));
            editBookModal.hide(); // Tutup modal setelah berhasil
            fetchBooks(); // Refresh daftar buku
        } else {
            const error = await response.json();
            showToast(`Failed to update book: ${error.error}`);
        }
        } catch (error) {
        console.error("Error updating book:", error);
        showToast("An error occurred. Please try again.");
        }
    });

// Initialize Dashboard
document.getElementById("get-loans-tab").addEventListener("click", () => fetchLoans());
document.getElementById("get-users-tab").addEventListener("click", () => fetchUsers());
fetchBooks();
loadStatistics();
