
const expenseForm = document.getElementById("expense-form");
const expenseNameInput = document.getElementById("expense-name");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseCategoryInput = document.getElementById("expense-category");
const expenseDateInput = document.getElementById("expense-date");

const totalExpensesElement = document.getElementById("total-expenses");
const expenseCountElement = document.getElementById("expense-count");
const expenseList = document.getElementById("expense-list");
const expenseListMessage = document.getElementById("expense-list-message");
const categoryFilter = document.getElementById("category-filter");
const formMessage = document.getElementById("form-message");

const STORAGE_KEY = "my-expense-tracker-data";

let expenses = loadExpenses();

// Set today's date as the default date.
const today = getTodayDate();
expenseDateInput.value = today;
expenseDateInput.max = today;

// Get today's date in YYYY-MM-DD format using local time.
function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Load saved expenses from localStorage.
function loadExpenses() {
    try {
        const savedExpenses = localStorage.getItem(STORAGE_KEY);

        if (!savedExpenses) {
            return [];
        }

        const parsedExpenses = JSON.parse(savedExpenses);

        if (!Array.isArray(parsedExpenses)) {
            return [];
        }

        return parsedExpenses.filter(function (expense) {
            return (
                expense &&
                typeof expense.id === "string" &&
                typeof expense.name === "string" &&
                expense.name.trim() !== "" &&
                typeof expense.amount === "number" &&
                Number.isFinite(expense.amount) &&
                expense.amount > 0 &&
                typeof expense.category === "string" &&
                typeof expense.date === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
            );
        });
    } catch (error) {
        console.error("Could not load expenses:", error);
        return [];
    }
}

// Save expenses to localStorage.
function saveExpenses() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        return true;
    } catch (error) {
        console.error("Could not save expenses:", error);
        return false;
    }
}

// Format an amount as Sri Lankan Rupees.
function formatAmount(amount) {
    return "LKR " + amount.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format a date for display.
function formatDate(dateString) {
    const parts = dateString.split("-");

    // Construct the date in local time to avoid timezone shifts.
    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Create and add a new expense.
expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = expenseNameInput.value.trim();
    const amount = Number(expenseAmountInput.value);
    const category = expenseCategoryInput.value;
    const date = expenseDateInput.value;

    formMessage.textContent = "";

    if (name === "") {
        formMessage.textContent = "Please enter an expense name.";
        expenseNameInput.focus();
        return;
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 1000000000
    ) {
        formMessage.textContent = "Please enter a valid amount.";
        expenseAmountInput.focus();
        return;
    }

    if (category === "") {
        formMessage.textContent = "Please select a category.";
        expenseCategoryInput.focus();
        return;
    }

    if (!date || date > today) {
        formMessage.textContent = "Please select a valid date.";
        expenseDateInput.focus();
        return;
    }

    const newExpense = {
        id: createId(),
        name: name,
        amount: amount,
        category: category,
        date: date
    };

    expenses.push(newExpense);

    if (!saveExpenses()) {
        expenses.pop();
        formMessage.textContent =
            "Could not save the expense. Please check your browser storage.";
        return;
    }

    expenseForm.reset();
    expenseDateInput.value = today;
    formMessage.textContent = "";

    renderExpenses();
});

// Create a simple unique ID for each expense.
function createId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return Date.now().toString() + Math.random().toString(36).slice(2);
}

// Calculate and display the total and count.
function updateSummary() {
    const total = expenses.reduce(function (sum, expense) {
        return sum + expense.amount;
    }, 0);

    totalExpensesElement.textContent = formatAmount(total);
    expenseCountElement.textContent = expenses.length;
}

// Display expenses based on the selected category.
function renderExpenses() {
    expenseList.replaceChildren();

    const selectedCategory = categoryFilter.value;

    const filteredExpenses = expenses
        .filter(function (expense) {
            return (
                selectedCategory === "All" ||
                expense.category === selectedCategory
            );
        })
        .sort(function (a, b) {
            return b.date.localeCompare(a.date) ||
                b.id.localeCompare(a.id);
        });

    if (filteredExpenses.length === 0) {
        if (expenses.length === 0) {
            expenseListMessage.textContent =
                "No expenses yet. Add your first expense above.";
        } else {
            expenseListMessage.textContent =
                "No expenses found in this category.";
        }
    } else {
        expenseListMessage.textContent = "";
    }

    filteredExpenses.forEach(function (expense) {
        const listItem = document.createElement("li");
        listItem.className = "expense-item";

        const details = document.createElement("div");
        details.className = "expense-details";

        const name = document.createElement("h3");
        name.textContent = expense.name;

        const information = document.createElement("p");
        information.textContent =
            expense.category + " · " + formatDate(expense.date);

        details.append(name, information);

        const rightSide = document.createElement("div");
        rightSide.className = "expense-right";

        const amount = document.createElement("span");
        amount.className = "expense-amount";
        amount.textContent = formatAmount(expense.amount);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            "Delete expense: " + expense.name
        );

        deleteButton.addEventListener("click", function () {
            deleteExpense(expense.id);
        });

        rightSide.append(amount, deleteButton);
        listItem.append(details, rightSide);
        expenseList.appendChild(listItem);
    });

    updateSummary();
}

// Delete an expense.
function deleteExpense(id) {
    const originalExpenses = expenses;
    expenses = expenses.filter(function (expense) {
        return expense.id !== id;
    });

    if (!saveExpenses()) {
        expenses = originalExpenses;
        formMessage.textContent =
            "Could not save this change. Please check your browser storage.";
        renderExpenses();
        return;
    }

    formMessage.textContent = "";
    renderExpenses();
}

// Update the list when the category changes.
categoryFilter.addEventListener("change", function () {
    renderExpenses();
});

// Display the saved expenses when the page opens.
renderExpenses();
