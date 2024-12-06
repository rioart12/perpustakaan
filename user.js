// Handle Logout
const logout = () => {
    localStorage.removeItem("token");
    alert("You have been logged out successfully.");
    window.location.href = "/index.html";
    };

    document.getElementById("logoutButton").addEventListener("click", logout);

    // Render Books
    const renderBooks = (books, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    books.forEach((book) => {
        const card = document.createElement("div");
        card.className = "col-md-6 col-lg-4";

        card.innerHTML = `
        <div class="card shadow-sm">
            <img src="${book.image_url || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${book.title}">
            <div class="card-body">
                <h5 class="card-title">${book.title}</h5>
                <p class="card-text">
                    <strong>Author:</strong> ${book.author}<br>
                    <strong>Category:</strong> ${book.category}<br>
                    <strong>Description:</strong> ${book.description || "No description available"}
                </p>
            </div>
            <div class="card-footer d-flex justify-content-between align-items-center">
                <span class="availability ${book.availability ? 'available' : 'not-available'}">
                    ${book.availability ? "Available" : "Not Available"}
                </span>
                <button class="btn btn-sm btn-success select-book" 
                    data-id="${book.id}" 
                    data-title="${book.title}" 
                    ${!book.availability ? 'disabled' : ''}>
                    Select for Loan
                </button>
            </div>
        </div>
        `;
        container.appendChild(card);
    });

    document.getElementById("useLocationButton").addEventListener("click", async () => {
      const locationInput = document.getElementById("location");
    
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }
    
      // Show loading indication
      locationInput.value = "Fetching location...";
      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
    
            // Reverse Geocoding to get address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
    
            if (response.ok) {
              const data = await response.json();
              locationInput.value = data.display_name || "Location found, but address unavailable.";
            } else {
              locationInput.value = "Unable to fetch address.";
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            locationInput.value = "Failed to get location.";
          }
        );
      } catch (err) {
        console.error("Error in location fetching:", err);
        locationInput.value = "Error fetching location.";
      }
    });    

    // Tambahkan Event Listener untuk tombol Select for Loan
    document.querySelectorAll(".select-book").forEach((button) => {
        button.addEventListener("click", (e) => {
        const bookId = e.target.getAttribute("data-id");
        const bookTitle = e.target.getAttribute("data-title");

        // Isi modal dengan data buku
        document.getElementById("bookId").value = bookId;
        document.getElementById("loanFormModalLabel").innerText = `Create Loan for: ${bookTitle}`;

        // Buka modal
        const loanFormModal = new bootstrap.Modal(document.getElementById("loanFormModal"));
        loanFormModal.show();
        });
    });
    };

    // Load Books
    const loadBooks = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Unauthorized! Redirecting to login...");
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/books", {
        headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
        const data = await response.json();
        renderBooks(data.books, "bookList");
        } else {
        alert("Failed to load books.");
        }
    } catch (error) {
        console.error("Error loading books:", error);
    }
    };

    // Search Books
    document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const query = document.getElementById("searchQuery").value.trim();
    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Unauthorized! Redirecting to login...");
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/books/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
        const data = await response.json();
        renderBooks(data.books, "searchResults");
        } else {
        alert("Search failed. Please try again.");
        }
    } catch (error) {
        console.error("Error searching books:", error);
        alert("Search failed. Please check your connection.");
    }
    });

    // Handle Book Return
    async function returnBook(loanId) {
        const token = localStorage.getItem("token");

        // Validasi status tombol
        const returnButton = document.querySelector(`button[data-loan-id='${loanId}']`);
        if (returnButton && returnButton.disabled) {
            showToast("This book has already been returned.", "danger");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/returns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ loan_id: loanId }),
            });

            if (response.ok) {
                showToast("Book returned successfully!", "success");

                // Perbarui tombol di DOM
                if (returnButton) {
                    returnButton.disabled = true; // Nonaktifkan tombol
                    returnButton.textContent = "Returned"; // Ubah teks tombol
                    returnButton.classList.add("btn-secondary"); // Ubah warna tombol
                    returnButton.classList.remove("btn-danger"); // Hapus warna lama
                }

            } else {
                const error = await response.json();
                showToast(`Failed to return book: ${error.error}`, "danger");
            }
        } catch (error) {
            console.error("Error returning book:", error);
            showToast("An error occurred. Please try again.", "danger");
        }
    }

    // Show Toast for Notifications
    function showToast(message, type = "success") {
        const toastContainer = document.getElementById("toastContainer");
        const toastId = `toast-${Date.now()}`; // ID unik untuk setiap toast

        const toastElement = document.createElement("div");
        toastElement.className = `toast align-items-center text-bg-${type} border-0`;
        toastElement.setAttribute("role", "alert");
        toastElement.setAttribute("aria-live", "assertive");
        toastElement.setAttribute("aria-atomic", "true");
        toastElement.id = toastId;

        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove();
        });
        }


    // Improved: Load Loan Records and prevent race conditions
    const loadLoanRecords = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch("http://localhost:3000/loans", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache", // Ensure fresh data
                },
            });

            if (response.ok) {
                const data = await response.json();
                const loanRecords = document.getElementById("loanRecords");
                loanRecords.innerHTML = ""; // Clear existing records

                data.loans.forEach((loan, index) => {
                    const isReturned = loan.status === "returned"; // Ensure server uses the correct 'returned' status
                    const row = document.createElement("tr");

                    row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${loan.borrower_name}</td>
                    <td>${loan.book_title}</td>
                    <td>${loan.location}</td>
                    <td>${loan.loan_date}</td>
                    <td>${loan.return_date}</td>
                    <td>${loan.delay_days || 0}</td>
                    <td>Rp ${loan.fine_amount || 0}</td>
                    <td>
                      <button 
                        class="btn ${isReturned ? 'btn-secondary' : 'btn-danger'} btn-sm"
                        data-loan-id="${loan.id}" 
                        ${isReturned ? 'disabled' : ''} 
                        onclick="${!isReturned ? `returnBook(${loan.id})` : ''}">
                        ${isReturned ? "Returned" : "Return"}
                      </button>
                    </td>
                  `;
                  loanRecords.appendChild(row);
                });
              } else {
                alert("Failed to load loan records.");
              }
            } catch (error) {
              console.error("Error loading loan records:", error);
            }
          };

    // Load Profil Pengguna
const loadUserProfile = async () => {
    const token = localStorage.getItem("token");
  
    try {
      const response = await fetch("http://localhost:3000/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.ok) {
        const user = await response.json();
  
        // Isi form profil
        document.getElementById("profileName").value = user.nama_lengkap || "";
        document.getElementById("profileEmail").value = user.email || "";
        document.getElementById("profilePhone").value = user.phone_number || ""; // Tambahkan nomor telepon
        document.getElementById("profileAddress").value = user.address || ""; // Tambahkan alamat
  
        // Tampilkan gambar profil
        const profileImagePreview = document.getElementById("profileImagePreview");
        profileImagePreview.src = user.profile_image || "https://via.placeholder.com/150";
      } else if (response.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = "/index.html"; // Redirect ke halaman login
      } else {
        alert("Failed to load profile.");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      alert("Error loading profile. Please check your connection.");
    }
  };  

    // Update Profil Pengguna
    document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
      
        const formData = new FormData(e.target); // Ambil semua data form, termasuk file
        const token = localStorage.getItem("token");
      
        try {
          const response = await fetch("http://localhost:3000/users/me", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
      
          if (response.ok) {
            const updatedUser = await response.json(); // Data terbaru dari backend
            alert("Profile updated successfully!");
      
            // Tampilkan data baru di frontend
            document.getElementById("profileImagePreview").src =
              updatedUser.profile_image || "https://via.placeholder.com/150";
            document.getElementById("profileName").value = updatedUser.nama_lengkap;
            document.getElementById("profileEmail").value = updatedUser.email;
          } else {
            const error = await response.json();
            alert(`Failed to update profile: ${error.error}`);
          }
        } catch (error) {
          console.error("Error updating profile:", error);
          alert("An error occurred while updating the profile.");
        }
      });
      
    // Ganti Kata Sandi
    document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
        e.preventDefault();
      
        const current_password = document.getElementById("currentPassword").value;
        const new_password = document.getElementById("newPassword").value;
        const token = localStorage.getItem("token");
      
        // Validasi panjang kata sandi baru (minimal 8 karakter)
        if (new_password.length < 8) {
          alert("New password must be at least 8 characters long.");
          return;
        }
      
        try {
          const response = await fetch("http://localhost:3000/users/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ current_password, new_password }),
          });
      
          if (response.ok) {
            alert("Password changed successfully!");
            e.target.reset(); // Reset form setelah sukses
            console.log("Password updated successfully.");
          } else if (response.status === 401) {
            alert("Unauthorized: Please log in again.");
            localStorage.removeItem("token"); // Hapus token yang kedaluwarsa
            window.location.href = "/index.html"; // Redirect ke login
          } else {
            const error = await response.json();
            alert(`Failed to change password: ${error.error}`);
            console.error("Error changing password:", error);
          }
        } catch (error) {
          console.error("Error changing password:", error);
          alert("An error occurred while changing the password. Please try again.");
        }
      });      

    // Pratinjau Gambar Profil
    document.getElementById("profileImage").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
        document.getElementById("profileImagePreview").src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    });

    // Handle Loan Form Submission
  document.getElementById("createLoanForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const book_id = document.getElementById("bookId").value;
    const borrower_name = document.getElementById("borrowerName").value;
    const location = document.getElementById("location").value;
    const loan_date = document.getElementById("loanDate").value;
    const return_date = document.getElementById("returnDate").value;
    
    // Validasi: Pastikan return_date <= loan_date + 14 hari
    const maxLoanPeriod = 14; // Maksimal peminjaman dalam hari
    const maxReturnDate = new Date(loan_date);
    maxReturnDate.setDate(maxReturnDate.getDate() + maxLoanPeriod);

    if (return_date > maxReturnDate) {
      alert(`Return date cannot exceed 14 days from the loan date. Maximum return date: ${maxReturnDate.toISOString().split("T")[0]}`);
      return;
    }

    if (return_date <= loan_date) {
    alert("Return date must be after the loan date.");
    return;
    }

    try {
        const response = await fetch("http://localhost:3000/loans", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ book_id, borrower_name, location, loan_date, return_date }),
        });

        if (response.ok) {
        alert("Loan created successfully!");
        
      document.getElementById("createLoanForm").reset();

        // Tutup modal setelah berhasil
        const loanFormModal = bootstrap.Modal.getInstance(document.getElementById("loanFormModal"));
        loanFormModal.hide();

        // Refresh daftar buku
        loadBooks();
        } else {
        const error = await response.json();
        alert(`Failed to create loan: ${error.error}`);
        }
    } catch (error) {
        console.error("Error creating loan:", error);
        alert("An error occurred. Please try again.");
    }
    });

    const fetchActiveLoans = async () => {
  try {
    const response = await fetch("http://localhost:3000/loans/stats", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById("activeLoans").textContent = data.active || 0;
    } else {
      console.error("Failed to fetch loan stats");
      document.getElementById("activeLoans").textContent = "Error";
    }
  } catch (error) {
    console.error("Error fetching loan stats:", error);
    document.getElementById("activeLoans").textContent = "Error";
  }
};

// Fetch and Display Fines
const fetchFines = async () => {
  try {
      const response = await fetch("http://localhost:3000/loans/fines", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.ok) {
          const fines = await response.json();
          const finesTable = document.getElementById("finesTable");
          finesTable.innerHTML = ""; // Bersihkan data lama

          if (fines.length === 0) {
              finesTable.innerHTML = `<tr><td colspan="5">No fines to display.</td></tr>`;
          } else {
              fines.forEach((fine, index) => {
                  const row = document.createElement("tr");
                  row.innerHTML = `
                      <td>${index + 1}</td>
                      <td>${fine.book_title}</td>
                      <td>${fine.loan_date}</td>
                      <td>${fine.return_date}</td>
                      <td>Rp ${fine.fine_amount.toLocaleString()}</td>
                  `;
                  finesTable.appendChild(row);
              });
          }
      } else {
          const error = await response.json();
          console.error("Failed to fetch fines:", error.error);
      }
  } catch (error) {
      console.error("Error fetching fines:", error);
  }
};

// Show Warning Notifications for Fines and Loan Policy
const showLoanNotifications = async () => {
  try {
      const token = localStorage.getItem("token");

      // Fetch fines
      const finesResponse = await fetch("http://localhost:3000/loans/fines", {
          headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch active loans
      const loansResponse = await fetch("http://localhost:3000/loans", {
          headers: { Authorization: `Bearer ${token}` },
      });

      if (finesResponse.ok && loansResponse.ok) {
          const fines = await finesResponse.json();
          const loans = await loansResponse.json();

          // Warning about fines
          if (fines.length > 0) {
              showToast(
                  `You have ${fines.length} overdue books. Please return them to avoid additional fines.`,
                  "warning"
              );
          }

          // Warning about loan policy
          loans.loans.forEach((loan) => {
              const returnDate = new Date(loan.return_date);
              const loanDate = new Date(loan.loan_date);
              const maxLoanPeriod = 14; // Maksimal 14 hari

              if ((returnDate - loanDate) / (1000 * 60 * 60 * 24) > maxLoanPeriod) {
                  showToast(
                      `The loan period for "${loan.book_title}" exceeds 2 week. Please return it promptly.`,
                      "warning"
                  );
              }
          });
      } else {
          console.error("Failed to fetch fines or loans.");
      }
  } catch (error) {
      console.error("Error fetching notifications:", error);
  }
};


    document.addEventListener("DOMContentLoaded", () => {
    loadBooks();
    loadLoanRecords();
    loadUserProfile();
    showLoanNotifications();
    });