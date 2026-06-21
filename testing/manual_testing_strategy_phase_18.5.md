# Manual Testing Strategy: Phase 18.5 Case Notes & Tags (No AI)

This document outlines the step-by-step manual verification strategy for verifying the Case Notes and Case Tags feature in the **Mobile Legal AI Assistant**.

---

## 1. Scope of Verification

The goal of Phase 18.5 is to introduce **Case Notes** (creation, deletion, and chronological display) and **Case Tags** (toggling, color coding, card displaying, and main list filtering) as entirely local, secure, and non-AI features.

We must verify:
* **Storage and Persistence**: Schema updates in `useCaseStore.js` are robust and survive application restarts.
* **Tags Display & Filtering (`CasesScreen.jsx`)**: Filter bar renders horizontally, filters case list dynamically, and case cards display the active tags with matching color backgrounds.
* **Tags Selector (`CaseDetailsScreen.jsx`)**: Six custom tag chips can be toggled on/off, with colors updating immediately.
* **Notes CRUD (`CaseDetailsScreen.jsx`)**: Notes can be added with non-empty validation, are displayed in reverse-chronological order (newest first) with proper local timestamps, and can be deleted after confirming the alert dialog.

---

## 2. Test Environments

* **Physical Android Device / Emulator**: Running Android 10+ (for API level verification).
* **Metro Bundler**: React Native Dev Environment running on local host.

---

## 3. Step-by-Step Test Suites

### Test Suite A: Schema & Default Initialization
1. Open the application.
2. Navigate to the **Case Files** section.
3. Tap the **+** (FAB) button to create a new case folder.
4. Input required metadata (Title: `Test Case 18.5`, Client Name: `Ramesh Kumar`, Court: `High Court of Karnataka`).
5. Tap **Create Case Workspace**.
6. Verify the case card renders with zero tags and zero document indicators.

### Test Suite B: Tag Selection & Multi-Toggling
1. Tap the newly created `Test Case 18.5` folder card to open the **Case Details Screen**.
2. Scroll to the **🏷️ Case Tags** section.
3. Verify all 6 standardized tags are visible:
   * `Urgent`
   * `Hearing Tomorrow`
   * `Evidence Pending`
   * `Draft Required`
   * `Notice Sent`
   * `Ready for Filing`
4. Tap **Urgent**. Verify its background color changes to **Red (`#E53E3E`)** and text turns bold white.
5. Tap **Draft Required**. Verify its background color changes to **Blue (`#3182CE`)** and text turns bold white.
6. Tap **Urgent** again. Verify it returns to the inactive/unselected grey-blue style.
7. Tap **Urgent** and **Ready for Filing** (Green, `#38A169`) so that `Urgent`, `Draft Required`, and `Ready for Filing` are active.

### Test Suite C: main list tags rendering & Filtering
1. Tap the Back button (`<`) in the Header to return to the **Case Files Screen**.
2. Look at the `Test Case 18.5` card.
3. Verify that the 3 tags (`Urgent`, `Draft Required`, `Ready for Filing`) are rendered on the card below the title and case number, each with its designated color.
4. Locate the **Tag Filter Bar** at the top (below the header).
5. Verify `All` is selected by default and all cases are listed.
6. Tap the **Urgent** filter chip.
   * Verify the list is dynamically filtered and displays `Test Case 18.5`.
7. Tap the **Notice Sent** filter chip.
   * Verify that `Test Case 18.5` is hidden from the list (unless another case has that tag).
8. Tap the **All** filter chip.
   * Verify the full list of cases is restored.

### Test Suite D: Notes CRUD & Formatting
1. Navigate back to `Test Case 18.5` Case Details.
2. Scroll to the bottom **📝 Case Notes** section.
3. Verify the input placeholder says `Write a custom note...` and that there is an **Add** button.
4. Leave the text field empty and tap **Add**. Verify no empty note is added (prevented by whitespace check).
5. Type `First note: Spoke to client, requested scanned FIR.` and tap **Add**.
   * Verify the note is added to the list immediately.
   * Verify the note card displays a timestamp formatted to local date/time (e.g. `MM/DD/YYYY, H:MM:SS AM/PM`).
   * Verify the input field is cleared.
6. Type `Second note: Next hearing is final argument.` and tap **Add**.
   * Verify this note appears **above** the first note (newest notes must appear at the top).
7. Tap the trash icon (🗑️) on the second note.
   * Verify an Alert dialog appears: `Delete Note` - `Are you sure you want to delete this note?`.
8. Tap **Cancel**. Verify the note is NOT deleted.
9. Tap the trash icon (🗑️) again and select **Delete**.
   * Verify the note is immediately removed from the UI.

### Test Suite E: Storage Persistence Verification
1. With tags active (`Urgent`, etc.) and the note `First note...` present in `Test Case 18.5`, reload the application (press `R` twice in Metro console or close and reopen the app).
2. Go to **Case Files**.
3. Verify the tags and notes are still visible and perfectly persisted.
