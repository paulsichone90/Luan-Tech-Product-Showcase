
const API_URL = "http://localhost:3000/api/products";

// Store products loaded from the backend.
let products = [];

// HTML elements
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productNameInput = document.getElementById("productName");
const brandInput = document.getElementById("brand");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");
const stockQuantityInput = document.getElementById("stockQuantity");
const descriptionInput = document.getElementById("description");

const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");
const refreshButton = document.getElementById("refreshButton");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const stockFilter = document.getElementById("stockFilter");
const sortSelect = document.getElementById("sortSelect");

const productTableBody = document.getElementById("productTableBody");
const totalProducts = document.getElementById("totalProducts");
const totalStock = document.getElementById("totalStock");
const inventoryValue = document.getElementById("inventoryValue");
const lowStockCount = document.getElementById("lowStockCount");
const resultCount = document.getElementById("resultCount");

const messageBox = document.getElementById("message");
const apiStatus = document.getElementById("apiStatus");

// Display a success or error message.
function showMessage(message, type = "success") {
    messageBox.textContent = message;
    messageBox.className = type;

    setTimeout(() => {
        messageBox.textContent = "";
        messageBox.className = "";
    }, 5000);
}

// Safely convert values to text for display.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// Format amounts as Zambian kwacha.
function formatMoney(amount) {
    return "K" + Number(amount).toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Fetch all products from the backend.
async function loadProducts() {
    apiStatus.textContent = "Connecting...";
    apiStatus.className = "api-status";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Could not retrieve products.");
        }

        products = await response.json();

        apiStatus.textContent = "API Connected";
        apiStatus.className = "api-status online";

        updateDashboard();
        renderProducts();

    } catch (error) {
        apiStatus.textContent = "API Offline";
        apiStatus.className = "api-status offline";

        productTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Could not load products. Check that your backend
                    and MySQL server are running, then refresh.
                </td>
            </tr>
        `;

        showMessage(error.message, "error");
    }
}

// Update the summary cards.
function updateDashboard() {
    const stock = products.reduce(
        (sum, product) =>
            sum + Number(product.stock_quantity),
        0
    );

    const value = products.reduce(
        (sum, product) =>
            sum +
            Number(product.price) *
            Number(product.stock_quantity),
        0
    );

    // Low stock means 1–5 units.
    // Products with zero stock are counted separately.
    const lowStock = products.filter(product => {
        const quantity = Number(product.stock_quantity);
        return quantity >= 1 && quantity <= 5;
    }).length;

    totalProducts.textContent = products.length;
    totalStock.textContent = stock.toLocaleString("en-ZM");
    inventoryValue.textContent = formatMoney(value);
    lowStockCount.textContent = lowStock;
}

// Render products with search, category filtering,
// stock filtering, and sorting.
function renderProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedStock = stockFilter.value;
    const sortBy = sortSelect.value;

    // Build category options from the loaded products.
    const categories = [
        ...new Set(
            products
                .map(product =>
                    String(product.category || "").trim()
                )
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    categoryFilter.innerHTML =
        '<option value="">All categories</option>' +
        categories.map(category => `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("");

    // Keep the selected category if it still exists.
    categoryFilter.value = categories.includes(selectedCategory)
        ? selectedCategory
        : "";

    // Apply search and filters.
    const filteredProducts = products.filter(product => {
        const searchableText = [
            product.product_name,
            product.brand,
            product.category,
            product.description
        ]
            .map(value => String(value ?? ""))
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesCategory =
            !categoryFilter.value ||
            String(product.category || "").trim() ===
                categoryFilter.value;

        const stock = Number(product.stock_quantity);

        let matchesStock = true;

        if (selectedStock === "in-stock") {
            matchesStock = stock > 5;
        } else if (selectedStock === "low-stock") {
            matchesStock = stock >= 1 && stock <= 5;
        } else if (selectedStock === "out-of-stock") {
            matchesStock = stock === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    // Sort a copy to preserve the original products array.
    const sortedProducts = [...filteredProducts];

    sortedProducts.sort((a, b) => {
        const nameA = String(a.product_name || "");
        const nameB = String(b.product_name || "");

        switch (sortBy) {
            case "id-desc":
                return Number(b.id) - Number(a.id);

            case "name-asc":
                return nameA.localeCompare(nameB);

            case "name-desc":
                return nameB.localeCompare(nameA);

            case "price-asc":
                return Number(a.price) - Number(b.price);

            case "price-desc":
                return Number(b.price) - Number(a.price);

            case "stock-asc":
                return Number(a.stock_quantity) -
                    Number(b.stock_quantity);

            case "stock-desc":
                return Number(b.stock_quantity) -
                    Number(a.stock_quantity);

            case "id-asc":
            default:
                return Number(a.id) - Number(b.id);
        }
    });

    resultCount.textContent =
        `${sortedProducts.length} of ${products.length} products`;

    // Handle empty search/filter results.
    if (sortedProducts.length === 0) {
        productTableBody.innerHTML = `
            <tr>
                <td colspan="7">No matching products found.</td>
            </tr>
        `;
        return;
    }

    // Display product rows.
    productTableBody.innerHTML = sortedProducts.map(product => {
        const stock = Number(product.stock_quantity);

        let stockClass = "";
        let stockLabel = `${stock} units`;

        if (stock === 0) {
            stockClass = "empty";
            stockLabel = "Out of stock";
        } else if (stock <= 5) {
            stockClass = "low";
            stockLabel = `Low: ${stock}`;
        }

        return `
            <tr>
                <td>${Number(product.id)}</td>

                <td>
                    <span class="product-name">
                        ${escapeHTML(product.product_name)}
                    </span>
                </td>

                <td>${escapeHTML(product.brand)}</td>
                <td>${escapeHTML(product.category)}</td>

                <td class="price">
                    ${formatMoney(product.price)}
                </td>

                <td>
                    <span class="stock-badge ${stockClass}">
                        ${escapeHTML(stockLabel)}
                    </span>
                </td>

                <td>
                    <div class="actions">
                        <button
                            type="button"
                            class="btn-edit"
                            data-action="edit"
                            data-id="${Number(product.id)}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn-delete"
                            data-action="delete"
                            data-id="${Number(product.id)}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Read the form fields into a product object.
function getFormData() {
    return {
        product_name: productNameInput.value.trim(),
        brand: brandInput.value.trim(),
        category: categoryInput.value.trim(),
        price: Number(priceInput.value),
        stock_quantity: Number(stockQuantityInput.value),
        description: descriptionInput.value.trim()
    };
}

// Send a request to the backend.
async function sendRequest(url, method, data) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== undefined) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Handle JSON responses from the backend.
    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.message ||
            "Request failed."
        );
    }

    return result;
}

// Add a new product or update an existing product.
productForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!productForm.reportValidity()) {
        return;
    }

    const data = getFormData();
    const id = productIdInput.value;
    const isEditing = id !== "";

    const url = isEditing
        ? `${API_URL}/${encodeURIComponent(id)}`
        : API_URL;

    const method = isEditing ? "PUT" : "POST";

    submitButton.disabled = true;
    submitButton.textContent = isEditing
        ? "Updating..."
        : "Adding...";

    try {
        const result = await sendRequest(url, method, data);

        showMessage(
            result.message ||
            (isEditing
                ? "Product updated successfully."
                : "Product created successfully.")
        );

        resetForm();
        await loadProducts();

    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = productIdInput.value
            ? "Update product"
            : "Add product";
    }
});

// Populate the form when Edit is clicked.
function editProduct(id) {
    const product = products.find(
        item => Number(item.id) === Number(id)
    );

    if (!product) {
        showMessage("Product could not be found.", "error");
        return;
    }

    productIdInput.value = product.id;
    productNameInput.value = product.product_name;
    brandInput.value = product.brand;
    categoryInput.value = product.category;
    priceInput.value = product.price;
    stockQuantityInput.value = product.stock_quantity;
    descriptionInput.value = product.description || "";

    formTitle.textContent = `Edit product #${product.id}`;
    submitButton.textContent = "Update product";
    cancelEditButton.hidden = false;

    productForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    productNameInput.focus();
}

// Clear the form and return to Add mode.
function resetForm() {
    productForm.reset();
    productIdInput.value = "";

    formTitle.textContent = "Add a product";
    submitButton.textContent = "Add product";
    cancelEditButton.hidden = true;
}

// Delete a product after confirmation.
async function deleteProduct(id) {
    const product = products.find(
        item => Number(item.id) === Number(id)
    );

    if (!product) {
        showMessage("Product could not be found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Delete "${product.product_name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await sendRequest(
            `${API_URL}/${encodeURIComponent(id)}`,
            "DELETE"
        );

        showMessage(
            result.message || "Product deleted successfully."
        );

        if (Number(productIdInput.value) === Number(id)) {
            resetForm();
        }

        await loadProducts();

    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Handle Edit and Delete buttons using one table listener.
productTableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
        editProduct(id);
    } else if (button.dataset.action === "delete") {
        deleteProduct(id);
    }
});

// Search products as the user types.
searchInput.addEventListener("input", renderProducts);

// Filter by category.
categoryFilter.addEventListener("change", renderProducts);

// Filter by stock status.
stockFilter.addEventListener("change", renderProducts);

// Sort products.
sortSelect.addEventListener("change", renderProducts);

// Cancel editing.
cancelEditButton.addEventListener("click", resetForm);

// Reload the database records.
refreshButton.addEventListener("click", loadProducts);

// Load the initial product list when the page starts.
loadProducts();
