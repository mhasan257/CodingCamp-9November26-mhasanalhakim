# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that helps users track their daily spending. It displays a running total balance, a scrollable history of transactions, and a pie chart visualizing spending distribution by category. The app is built with HTML, CSS, and Vanilla JavaScript only, using browser Local Storage for persistence — no backend or framework required. It is designed as a 5-day beginner Coding Camp project with a clean, minimal interface that works well on mobile and desktop.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single spending record consisting of an item name, a monetary amount, and a category.
- **Category**: A classification label for a transaction. Default categories are Food, Transport, and Fun.
- **Balance**: The running total of all transaction amounts currently stored.
- **Transaction List**: The scrollable UI component that displays all stored transactions.
- **Input Form**: The UI form used to enter and submit a new transaction.
- **Chart**: The pie chart that visualizes spending distribution across categories, rendered via Chart.js.
- **Local Storage**: The browser's Local Storage API used as the sole persistence layer.
- **Validator**: The client-side logic that checks form field completeness before submission.
- **GitHub Pages**: The static site hosting service used to publish the App publicly.
- **Custom Category**: A user-defined category name added in addition to the default categories (Food, Transport, Fun).
- **Monthly Summary**: A view that aggregates and displays the total spending per calendar month based on stored transactions.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new spending transaction.

#### Acceptance Criteria

1. THE Input Form SHALL provide a text field for Item Name, a numeric field for Amount, and a dropdown selector for Category with an unselected placeholder as the default state, containing at minimum the options: Food, Transport, and Fun.
2. WHEN the user submits the Input Form with all fields filled and a positive Amount, THE App SHALL add the transaction to the Transaction List and persist it to Local Storage.
3. WHEN the user submits the Input Form, THE Validator SHALL verify that the Item Name field is not empty, the Amount field contains a positive number greater than zero, and a Category is selected.
4. IF the user submits the Input Form with one or more fields empty or the Amount is not a positive number, THEN THE Validator SHALL display an inline error message adjacent to each invalid field and SHALL NOT add the transaction.
5. WHEN a transaction is successfully added, THE Input Form SHALL reset all fields: Item Name to empty, Amount to empty, and Category to its unselected placeholder state.

---

### Requirement 2: Display and Manage the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction List SHALL display each transaction showing its Item Name, Amount formatted with a currency symbol and 2 decimal places, and a Category label.
2. IF the number of transactions exceeds the visible area of the Transaction List container, THEN THE Transaction List SHALL be scrollable to reveal all entries.
3. WHEN a transaction is added or deleted, THE Transaction List SHALL update to reflect the current set of stored transactions without requiring a page reload.
4. WHEN the user clicks the Delete button on a transaction entry, THE App SHALL remove that transaction from the Transaction List and from Local Storage.
5. WHEN the page is loaded or reloaded, THE App SHALL restore all previously stored transactions from Local Storage and render them in the Transaction List.
6. WHEN the Transaction List contains no transactions, THE App SHALL display a message indicating there are no transactions to show.

---

### Requirement 3: Display and Update the Total Balance

**User Story:** As a user, I want to see my total balance prominently at the top of the page so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the total Balance at the top of the page as the sum of all transaction amounts currently stored, formatted as a decimal number with exactly 2 decimal places.
2. WHEN a transaction is added or deleted, THE App SHALL recalculate and update the displayed Balance without requiring a page reload.
3. WHEN no transactions are stored, THE App SHALL display a Balance of 0.00.
4. WHEN the page is loaded or reloaded, THE App SHALL compute the Balance from Local Storage and display it before any user interaction.
5. IF Local Storage is unavailable or returns corrupted data during page load, THE App SHALL display a Balance of 0.00 and display an error message indicating the balance could not be loaded.

---

### Requirement 4: Visualize Spending by Category — Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand how my money is distributed.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart displaying the proportion of total spending for each Category that has at least one transaction, with each segment labeled by its Category name and its percentage of total spending rounded to one decimal place.
2. WHEN a transaction is added or deleted, THE Chart SHALL update to reflect the new spending distribution without requiring a page reload, and any Category whose total spending reaches zero SHALL be removed from the chart.
3. WHEN no transactions are stored, THE Chart SHALL display a text message indicating no spending data is available rather than rendering an empty chart or producing an error.
4. THE App SHALL use Chart.js to render the Chart.
5. THE Chart SHALL assign a unique color to each Category segment such that no two segments share the same color value.

---

### Requirement 5: Persist Data with Local Storage

**User Story:** As a user, I want my transactions to be saved between browser sessions so that I do not lose my spending history when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local Storage under a fixed, documented storage key.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local Storage under the same fixed storage key.
3. WHEN the App is loaded, THE App SHALL read the transaction list from Local Storage and initialize the Transaction List, Balance, and Chart from the stored data.
4. IF Local Storage is unavailable or the stored value is not valid JSON, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning message that does not require user dismissal.
5. THE App SHALL store and retrieve transaction data using JSON serialization so that each transaction's Item Name, Amount, and Category are preserved exactly across browser sessions.
6. IF a loaded transaction record is missing the Item Name, Amount, or Category field, or if Amount is not a valid positive number, THEN THE App SHALL discard that record and continue loading any remaining valid records.

---

### Requirement 6: Responsive and Accessible UI

**User Story:** As a mobile user, I want the app to display correctly on small screens so that I can track expenses on my phone.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to viewport widths from 320px to 1440px without horizontal scrolling or content overflow.
2. THE App SHALL present a card-based layout with a light gray page background and white card surfaces.
3. THE App SHALL apply sufficient color contrast between text and its background surface so that all text is comfortably readable, in accordance with WCAG 2.1 AA guidelines.
4. WHEN the App is rendered in the latest stable release of Chrome, Firefox, Edge, or Safari, THE App SHALL display all content correctly and all interactive elements SHALL remain operable.

---

### Requirement 7: Project Structure and Technology Constraints

**User Story:** As a developer and camp organizer, I want the project to follow a defined structure so that it is easy to review and meets the camp's technical requirements.

#### Acceptance Criteria

1. THE App SHALL be built using only HTML, CSS, and Vanilla JavaScript — no React, Vue, Angular, or other JavaScript frameworks or libraries (except Chart.js), and no backend code or server-side logic.
2. THE App SHALL contain exactly one CSS file, located inside a folder named `css/`.
3. THE App SHALL contain exactly one JavaScript file, located inside a folder named `js/`.
4. THE App's repository SHALL include the `.kiro` folder so that the spec and configuration files are preserved alongside the source code.

---

### Requirement 8: GitHub Version Control and Deployment

**User Story:** As a camp participant, I want to publish my project on GitHub so that it is accessible online and I can demonstrate my work.

#### Acceptance Criteria

1. THE App's source code SHALL be version-controlled in a GitHub repository managed using GitHub Desktop.
2. THE App's repository name SHALL follow the format: `CodingCamp-[batch date]-[participantname]` (for example, `CodingCamp-9November26-hasan`).
3. THE App SHALL be deployed and publicly accessible using GitHub Pages.
4. WHEN the GitHub Pages URL is opened in a browser, THE App SHALL load and function correctly without any additional setup.

---

### Requirement 9: Submission Requirements

**User Story:** As a camp organizer, I want participants to submit consistent information so that I can verify and evaluate all projects.

#### Acceptance Criteria

1. THE participant SHALL provide a valid AWS Builder ID as part of their project submission.
2. THE participant SHALL provide the URL of their GitHub repository containing the App's source code.
3. THE participant SHALL provide the published GitHub Pages URL where the App is live and accessible.

---

### Requirement 10: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a visible toggle control that switches the App's color scheme between a light theme and a dark theme.
2. WHEN the user activates the toggle, THE App SHALL apply the selected theme to all visible elements without requiring a page reload.
3. WHEN the user selects a theme, THE App SHALL save the preference to Local Storage so that the same theme is applied when the App is next loaded.

---

### Requirement 11: Sort Transactions

**User Story:** As a user, I want to sort my transaction list so that I can quickly find the highest or most relevant entries.

#### Acceptance Criteria

1. THE App SHALL provide controls that allow the user to sort the Transaction List by Amount (ascending or descending) or by Category (alphabetical order).
2. WHEN the user selects a sort option, THE Transaction List SHALL reorder its displayed entries accordingly without requiring a page reload.
3. THE App SHALL preserve the original insertion order in Local Storage and apply sorting only to the displayed list.

---

### Requirement 12: Spending Limit Highlight

**User Story:** As a user, I want to set a spending limit so that I can see when I have exceeded my budget.

#### Acceptance Criteria

1. THE App SHALL provide an input field that allows the user to set a numeric spending limit.
2. WHEN the total Balance exceeds the user-defined spending limit, THE App SHALL visually highlight the Balance display to indicate the limit has been exceeded.
3. WHEN the total Balance is at or below the spending limit, THE App SHALL display the Balance without the exceeded-limit highlight.
4. THE App SHALL save the spending limit to Local Storage so that it persists across browser sessions.

---

### Requirement 13: Custom Categories

**User Story:** As a user, I want to create my own spending categories so that I can organize my transactions in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide an input field that allows the user to add a custom category name.
2. WHEN the user submits a new custom category, THE App SHALL add it to the Category dropdown in the Input Form alongside the default categories (Food, Transport, Fun).
3. THE App SHALL save all custom categories to Local Storage so that they are available after the page is reloaded.
4. WHEN the App is loaded, THE App SHALL restore all saved custom categories from Local Storage and include them in the Category dropdown.
5. THE Chart SHALL include custom categories as distinct labeled segments with unique colors when transactions belonging to those categories exist.

---

### Requirement 14: Monthly Summary View

**User Story:** As a user, I want to view a summary of my spending by month so that I can understand my spending patterns over time.

#### Acceptance Criteria

1. THE App SHALL provide a monthly summary view that displays the total amount spent for each calendar month in which at least one transaction was recorded.
2. THE App SHALL calculate monthly totals based on the month in which each transaction was added.
3. WHEN a transaction is added or deleted, THE App SHALL update the monthly summary to reflect the current transaction data without requiring a page reload.
4. THE monthly summary SHALL display each month's name or year-month label alongside its total spending formatted with a currency symbol and 2 decimal places.
5. WHEN no transactions are stored, THE monthly summary view SHALL display a message indicating there is no spending data to summarize.
