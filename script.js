const API_BASE_URL = "http://localhost:3000"; // Ganti dengan URL server API Anda

// Utility: Show Toast Notification
const showToast = (message, title = "Notification", type = "info") => {
  const toastElement = document.getElementById("toastMessage");
  const toastTitle = document.getElementById("toastTitle");
  const toastBody = document.getElementById("toastBody");

  toastTitle.textContent = title;
  toastBody.textContent = message;

  toastElement.className = "toast"; // Reset classes
  if (type === "success") {
    toastElement.classList.add("bg-success", "text-white");
  } else if (type === "error") {
    toastElement.classList.add("bg-danger", "text-white");
  } else if (type === "warning") {
    toastElement.classList.add("bg-warning", "text-dark");
  } else {
    toastElement.classList.add("bg-info", "text-white");
  }

  const toast = new bootstrap.Toast(toastElement);
  toast.show();
};

// Utility: Validate form inputs
const validateInput = (fields) => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value || value.trim() === "") {
      showToast(`${key} is required.`, "Validation Error", "error");
      return false;
    }
  }
  return true;
};

// Utility: Logout user
const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  showToast("Logged out successfully!", "Success", "success");
  window.location.href = "/index.html"; // Redirect to login page
};

// Utility: Redirect if authenticated
const redirectIfAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (token) {
    const role = localStorage.getItem("role");
    showToast("You are already logged in. Redirecting...", "Info", "info");
    if (role === "admin") {
      window.location.href = "/dashboard-admin.html";
    } else {
      window.location.href = "/dashboard-user.html";
    }
  }
};

// Utility: Check Authentication for Protected Pages
const checkAuthentication = async (redirectURL = "/index.html") => {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Unauthorized access! Redirecting to login...", "Error", "error");
    window.location.href = redirectURL;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Invalid session");
  } catch (error) {
    console.error("Session check failed:", error);
    showToast("Session expired or invalid. Please log in again.", "Error", "error");
    logout();
  }
};

// Handle Login
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!validateInput({ username, password })) return;

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Login successful!", "Success", "success");
      localStorage.setItem("token", data.token); // Save token to localStorage
      localStorage.setItem("role", data.role); // Save role to localStorage

      // Redirect based on role
      if (data.role === "admin") {
        window.location.href = "/dashboard-admin.html";
      } else {
        window.location.href = "/dashboard-user.html";
      }
    } else {
      showToast(`Login failed: ${data.error}`, "Error", "error");
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast("An error occurred. Please try again.", "Error", "error");
  }
});

// Handle Registration
document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const namaLengkap = document.getElementById("registerNamaLengkap").value.trim();
  const role = document.getElementById("registerRole").value;
  const phoneNumber = document.getElementById("registerPhone").value.trim();
  const address = document.getElementById("registerAddress").value.trim();

  if (!validateInput({ username, password, email, namaLengkap, phoneNumber, address, role })) return;

  try {
      const response = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, email, nama_lengkap: namaLengkap, role, phone_number: phoneNumber, address }),
      });

      if (response.ok) {
          showToast("Pendaftaran berhasil! Silakan login.", "Success", "success");
          const loginTab = new bootstrap.Tab(document.getElementById("login-tab"));
          loginTab.show();
      } else {
          const errorData = await response.json();
          showToast(`Gagal mendaftar: ${errorData.error}`, "Error", "error");
      }
  } catch (error) {
      console.error("Error saat registrasi:", error);
      showToast("Terjadi kesalahan. Silakan coba lagi.", "Error", "error");
  }
});

// Automatically check if the user is logged in on the login/register page
if (window.location.pathname === "/index.html") {
  redirectIfAuthenticated();
}

// Protected route logic: Example for dashboard
if (window.location.pathname.startsWith("/dashboard")) {
  checkAuthentication();
}
