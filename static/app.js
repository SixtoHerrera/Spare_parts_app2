function addPart() {
    fetch("/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            part_number: document.getElementById("part_number").value,
            description: document.getElementById("description").value,
            category: document.getElementById("category").value,
            location: document.getElementById("location").value,
            min_stock: parseInt(document.getElementById("min_stock").value),
            max_stock: parseInt(document.getElementById("max_stock").value),
            current_stock: parseInt(document.getElementById("current_stock").value)
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadParts();
    });
}

const partsSearchState = {
    type: "",
    query: "",
    active: false
};

function ensurePartsSearchControls() {
    let searchType = document.getElementById("partsSearchType");
    let searchInput = document.getElementById("partsSearchInput");

    if (searchType && searchInput) {
        return;
    }

    const partsList = document.getElementById("partsList");
    if (!partsList || !partsList.parentElement) {
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "parts-search";
    wrapper.innerHTML = `
        <select id="partsSearchType" aria-label="Select parts search type">
            <option value="">Select Search Type</option>
            <option value="location">Location</option>
            <option value="part_number">Part Number</option>
            <option value="low_stock">Low Stock</option>
        </select>
        <input id="partsSearchInput" class="hidden" placeholder="Type search and press Enter">
    `;

    partsList.parentElement.insertBefore(wrapper, partsList);
}

function setupPartsSearch() {
    ensurePartsSearchControls();

    const searchType = document.getElementById("partsSearchType");
    const searchInput = document.getElementById("partsSearchInput");

    if (!searchType || !searchInput) {
        return;
    }

    searchType.addEventListener("change", () => {
        partsSearchState.type = searchType.value;
        partsSearchState.query = "";
        partsSearchState.active = false;
        searchInput.value = "";

        if (!partsSearchState.type) {
            searchInput.classList.add("hidden");
            loadParts();
            return;
        }

        searchInput.classList.remove("hidden");

        if (partsSearchState.type === "low_stock") {
            searchInput.placeholder = "Press Enter to show low stock parts";
        } else if (partsSearchState.type === "location") {
            searchInput.placeholder = "Type location and press Enter";
        } else {
            searchInput.placeholder = "Type part number and press Enter";
        }

        searchInput.focus();
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key !== "Enter") {
            return;
        }

        partsSearchState.active = true;
        partsSearchState.query = searchInput.value.trim();
        loadParts();
    });
}

function applyPartsSearchFilter(parts) {
    if (!partsSearchState.active || !partsSearchState.type) {
        return parts;
    }

    const query = partsSearchState.query.toLowerCase();

    if (partsSearchState.type === "low_stock") {
        return parts.filter(part => part[7] < part[5]);
    }

    if (partsSearchState.type === "location") {
        return parts.filter(part => String(part[4] || "").toLowerCase().includes(query));
    }

    if (partsSearchState.type === "part_number") {
        return parts.filter(part => String(part[1] || "").toLowerCase().includes(query));
    }

    return parts;
}

function showAppForUser(username) {
    document.getElementById("appContent").classList.remove("hidden");
    document.getElementById("currentUser").innerText = "Logged in as: " + username;
    setLogoutButtonVisibility(true);
    setLoginControlsDisabled(true);
}

function setLoginControlsDisabled(isDisabled) {
    const usernameInput = document.getElementById("username");
    const loginButton = document.getElementById("loginButton")
        || document.querySelector(".login-panel .inline-actions button[onclick='login()']");

    if (loginButton && !loginButton.id) {
        loginButton.id = "loginButton";
    }

    if (usernameInput) {
        usernameInput.disabled = isDisabled;
    }

    if (loginButton) {
        loginButton.disabled = isDisabled;
    }
}

function setLogoutButtonVisibility(isVisible) {
    const logoutButton = document.getElementById("logoutButton")
        || document.querySelector(".login-panel .inline-actions button[onclick='logoutUser()']");

    if (!logoutButton) {
        return;
    }

    if (!logoutButton.id) {
        logoutButton.id = "logoutButton";
    }

    logoutButton.classList.toggle("hidden", !isVisible);
}

function ensureLogoutButton() {
    const actions = document.querySelector(".login-panel .inline-actions");
    const existingLogoutButton = actions
        ? actions.querySelector("#logoutButton, button[onclick='logoutUser()']")
        : null;

    if (!actions || existingLogoutButton) {
        if (existingLogoutButton && !existingLogoutButton.id) {
            existingLogoutButton.id = "logoutButton";
        }
        return;
    }

    const logoutButton = document.createElement("button");
    logoutButton.id = "logoutButton";
    logoutButton.className = "ghost hidden";
    logoutButton.textContent = "Logout";
    logoutButton.onclick = logoutUser;

    actions.appendChild(logoutButton);
}

function hideAppForLogout() {
    document.getElementById("appContent").classList.add("hidden");
    document.getElementById("currentUser").innerText = "Not logged in";
    document.getElementById("partsList").innerHTML = "";
    document.getElementById("transactionList").innerHTML = "";
    setLogoutButtonVisibility(false);
    setLoginControlsDisabled(false);
}

function checkSessionAndInitialize() {
    fetch("/session_user")
    .then(res => res.json())
    .then(data => {
        if (data.user) {
            document.getElementById("username").value = data.user;
            showAppForUser(data.user);
            loadParts();
            loadTransactions();
        } else {
            setLogoutButtonVisibility(false);
            setLoginControlsDisabled(false);
        }
    })
    .catch(() => {
        setLogoutButtonVisibility(false);
        setLoginControlsDisabled(false);
    });
}

function normalizeQtyInput(partId) {
    const input = document.getElementById(`qty-${partId}`);

    if (!input) {
        return 1;
    }

    const parsedQty = parseInt(input.value, 10);
    const isInvalid = Number.isNaN(parsedQty) || parsedQty < 1 || input.value === "" || input.value === "null";

    if (isInvalid) {
        input.value = "1";
        return 1;
    }

    return parsedQty;
}

function ensureDeleteConfirmModal() {
    let overlay = document.getElementById("confirmOverlay");
    if (overlay) {
        return;
    }

    overlay = document.createElement("div");
    overlay.id = "confirmOverlay";
    overlay.className = "modal-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "confirmMessage");

    overlay.innerHTML = `
        <div class="modal-card">
            <p id="confirmMessage">you are about to erase this part and its information, proceed?</p>
            <div class="modal-actions">
                <button id="confirmYes" class="danger">Yes</button>
                <button id="confirmCancel" class="ghost">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function showDeleteConfirmation() {
    ensureDeleteConfirmModal();

    const overlay = document.getElementById("confirmOverlay");
    const message = document.getElementById("confirmMessage");
    const yesButton = document.getElementById("confirmYes");
    const cancelButton = document.getElementById("confirmCancel");

    if (!overlay || !message || !yesButton || !cancelButton) {
        return Promise.resolve(window.confirm("you are about to erase this part and its information, proceed?"));
    }

    message.innerText = "you are about to erase this part and its information, proceed?";
    overlay.classList.remove("hidden");

    return new Promise(resolve => {
        const cleanup = () => {
            overlay.classList.add("hidden");
            yesButton.removeEventListener("click", onYes);
            cancelButton.removeEventListener("click", onCancel);
        };

        const onYes = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        yesButton.addEventListener("click", onYes, { once: true });
        cancelButton.addEventListener("click", onCancel, { once: true });
    });
}


function loadParts() {
    fetch("/parts")
    .then(res => res.json())
    .then(data => {
        let list = document.getElementById("partsList");
        list.innerHTML = "";

        const filteredParts = applyPartsSearchFilter(data);

        if (!filteredParts.length) {
            if (partsSearchState.active && partsSearchState.type) {
                list.innerHTML = '<li class="empty-state">No parts match this search.</li>';
                return;
            }

            list.innerHTML = '<li class="empty-state">No parts found yet. Add your first part above.</li>';
            return;
        }

        filteredParts.forEach(part => {
            let item = document.createElement("li");

            let currentStock = part[7];
            let minStock = part[5];
            let isLow = currentStock < minStock;

            item.className = isLow ? "part-item low-stock" : "part-item normal-stock";

            item.innerHTML = `
                <div class="part-title">
                    ${part[1]} - ${part[2]}
                    ${isLow ? '<span class="stock-flag">LOW STOCK</span>' : ""}
                </div>
                <div class="part-meta">Category: ${part[3]} | Location: ${part[4]}</div>
                <div class="part-meta">Stock: ${currentStock} | Min: ${minStock} | Max: ${part[6]}</div>

                <div class="part-controls">
                    <label for="qty-${part[0]}">Qty</label>
                    <input type="number" id="qty-${part[0]}" value="1" class="qty-input" min="1">
                    <button onclick="issuePart(${part[0]})">Issue</button>
                    <button class="ghost" onclick="receivePart(${part[0]})">Receive</button>
                    <button class="danger" onclick="deletePart(${part[0]})">Delete</button>
                </div>
            `;

            list.appendChild(item);
        });
    });
}


function issuePart(partId) {
    let qty = normalizeQtyInput(partId);
    updateStock(partId, -qty);
}

function receivePart(partId) {
    let qty = normalizeQtyInput(partId);
    updateStock(partId, qty);
}

function deletePart(partId) {
    showDeleteConfirmation().then(confirmed => {
        if (!confirmed) {
            return;
        }

        fetch(`/parts/${partId}`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"}
        })
        .then(async res => {
            const contentType = res.headers.get("content-type") || "";
            const payload = contentType.includes("application/json")
                ? await res.json()
                : { message: await res.text() };

            if (!res.ok) {
                throw new Error(payload.message || "Delete failed");
            }

            return payload;
        })
        .then(data => {
            alert(data.message);
            loadParts();
            loadTransactions();
        })
        .catch(err => {
            alert(err.message || "Delete failed");
        });
    });
}


function updateStock(partId, change) {
    let user = document.getElementById("username").value || "Unknown";

    fetch("/update_stock", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            part_id: partId,
            change: change,
            user: user
        })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw err; });
        }
        return res.json();
    })
    .then(data => {
        alert(data.message);
        loadParts();
    })
    .catch(err => {
        alert(err.message);
    });
}


function loadTransactions() {
    fetch("/transactions")
    .then(res => res.json())
    .then(data => {
        let list = document.getElementById("transactionList");
        list.innerHTML = "";

        if (!data.length) {
            list.innerHTML = '<li class="empty-state">No transactions recorded yet.</li>';
            return;
        }

        data.forEach(tx => {
            let item = document.createElement("li");

            item.className = "transaction-item";
            item.innerHTML =
                "<strong>" + tx[1] + "</strong> | " + tx[2] + " | Qty: " + tx[3] +
                "<br>User: " + tx[4] + " | Date: " + tx[5];

            list.appendChild(item);
        });
    });
}


// Auto-load parts on page load
window.onload = function() {
    ensureLogoutButton();
    setLogoutButtonVisibility(false);
    setLoginControlsDisabled(false);
    setupPartsSearch();
    checkSessionAndInitialize();
};

function login() {
    let username = document.getElementById("username").value;

    fetch("/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: username})
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw err; });
        }
        return res.json();
    })
    .then(data => {
        alert(data.message);
        showAppForUser(username);
        loadParts();
        loadTransactions();
    })
    .catch(err => {
        alert(err.message || "Login failed");
    });
}

function logoutUser() {
    fetch("/logout", {
        method: "POST",
        headers: {"Content-Type": "application/json"}
    })
    .then(async res => {
        const contentType = res.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await res.json()
            : { message: await res.text() };

        if (!res.ok) {
            throw new Error(payload.message || "Logout failed");
        }

        return payload;
    })
    .then(data => {
        alert(data.message);
        document.getElementById("username").value = "";
        hideAppForLogout();
    })
    .catch(err => {
        alert(err.message || "Logout failed");
    });
}