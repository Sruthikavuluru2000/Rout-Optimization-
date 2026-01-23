# SIMPLE GUIDE: New Features Explained

## What is a "Scenario"?

**Think of a scenario like a saved version of your route planning.**

### Real Examples:

**Scenario 1: "January 2025"**
- Cities: Mumbai, Delhi, Bangalore
- Routes: R1, R2, R3
- Result: Costs ₹90,000 with 3 trucks

**Scenario 2: "February 2025"**
- Cities: Mumbai, Delhi, Chennai, Pune (added 2 cities)
- Routes: R1, R2, R3, R4 (added R4)
- Result: Costs ₹1,20,000 with 4 trucks

**Scenario 3: "What if truck costs increase 10%"**
- Same cities and routes as January
- But truck costs are higher
- Result: Costs ₹99,000 with 3 trucks

---

## 🆕 NEW FEATURES (Now Available!)

### 1. **EDIT DATA IN APP** (No Excel Needed!)

**What:** Edit your cities, routes, and costs directly in the app using tables

**How:**
1. Go to Dashboard
2. Click **"Create in App"** button (green button top-right)
3. You'll see 3 tables:
   - **Cities Table:** Add city name, demand, coordinates
   - **Route Cities Table:** Define which cities each route covers
   - **Route Truck Types Table:** Set capacity and cost for each route-truck combo
4. Click **"Add City"** / **"Add Route City"** / **"Add Route Truck"** to add rows
5. Fill in the data like a spreadsheet
6. Click **"Save & Optimize"** when done

**Why use this:**
- ✓ Quick changes without Excel
- ✓ Add/remove cities easily
- ✓ Change costs with one click
- ✓ Perfect for testing "what if" scenarios

---

### 2. **MULTI-FILE UPLOAD** (Upload 2-10 Files at Once!)

**What:** Upload multiple Excel files and compare them automatically

**How:**
1. Go to Dashboard
2. Click **"Multi-File Upload"** button (blue button top-right)
3. Select 2 or more Excel files (Shift+Click to select multiple)
4. Click **"Upload & Compare X Files"**
5. Wait while app:
   - Uploads each file
   - Optimizes each one
   - Creates scenarios with file names
   - Takes you to comparison page

**Why use this:**
- ✓ Compare different months instantly (Jan.xlsx, Feb.xlsx, Mar.xlsx)
- ✓ Test multiple cost scenarios at once
- ✓ See which option is cheapest
- ✓ Saves time - no need to upload one by one

**Example:**
Upload 3 files:
- `Q1_routes.xlsx` → becomes "Q1_routes" scenario
- `Q2_routes.xlsx` → becomes "Q2_routes" scenario
- `Q3_routes.xlsx` → becomes "Q3_routes" scenario

All 3 are optimized and compared side-by-side!

---

### 3. **RENAME SCENARIOS** (Easy Organization)

**What:** Change scenario names anytime

**How:**
1. Go to **Scenarios** page (sidebar)
2. Click the small **pencil icon** next to scenario name
3. Enter new name
4. Done!

**Why use this:**
- ✓ Better organization
- ✓ Fix typos
- ✓ Update names as plans change

---

### 4. **COMPARE INPUTS AND OUTPUTS** (See Everything!)

**What:** Compare not just results, but also what inputs were different

**Before:** Comparison only showed:
- Total cost difference
- Truck count difference

**Now:** Comparison shows:

**INPUT COMPARISON:**
- How many cities in each scenario?
- How many routes?
- What's the total demand?
- How many route-truck combinations?

**OUTPUT COMPARISON:**
- Total cost with % difference (↓ green = better, ↑ red = worse)
- Trucks needed
- Routes used
- Side-by-side maps

**Why use this:**
- ✓ Understand WHY costs are different
- ✓ See if adding cities increased cost
- ✓ Check if more routes helped

---

## HOW TO USE: COMPLETE WORKFLOWS

### Workflow A: Create Scenario by Editing in App

1. Dashboard → Click **"Create in App"**
2. Enter scenario name: "Test High Demand"
3. In Cities table:
   - Add: Mumbai, 2000 (high demand)
   - Add: Delhi, 2500
   - Add: Bangalore, 1800
4. In Route Cities table:
   - R1 covers Mumbai, Delhi
   - R2 covers Delhi, Bangalore
5. In Route Truck Types table:
   - R1 + T1: capacity 3000, cost 35000
   - R1 + T2: capacity 2000, cost 28000
   - R2 + T1: capacity 3000, cost 33000
   - R2 + T2: capacity 2000, cost 26000
6. Click **"Save & Optimize"**
7. See results!

---

### Workflow B: Upload Multiple Files and Compare

1. You have 3 Excel files:
   - `January_routes.xlsx`
   - `February_routes.xlsx`
   - `March_routes.xlsx`

2. Dashboard → Click **"Multi-File Upload"**

3. Select all 3 files (hold Shift and click)

4. Click **"Upload & Compare 3 Files"**

5. Wait 10-20 seconds

6. You're taken to comparison page showing:
   - January cost: ₹85,000
   - February cost: ₹92,000 (↑ 8.2% worse)
   - March cost: ₹88,000 (↓ 4.3% better than Feb)

7. See 3 maps side-by-side with routes

---

### Workflow C: Edit Existing Scenario and Test Changes

1. Go to **Scenarios** page

2. Find "January 2025" scenario

3. Click **"Edit"** button

4. You see all the data in editable tables

5. Change truck T1 cost from 30,000 to 33,000 (10% increase)

6. Click "Rename" icon → rename to "January - High Costs"

7. Click **"Save & Optimize"**

8. Now you have 2 scenarios:
   - "January 2025" (original)
   - "January - High Costs" (modified)

9. Go to Scenarios → Select both → Click **"Compare (2)"**

10. See: Original: ₹90,000 vs High Costs: ₹99,000 (10% increase)

---

## BUTTONS EXPLAINED

### Dashboard Page:

**"Multi-File Upload"** (Blue)
→ Upload 2-10 Excel files at once for comparison

**"Create in App"** (Green)
→ Build scenario by editing tables (no Excel)

**"Download Template"** (White)
→ Get sample Excel file

**"Upload & Validate"** (After selecting file)
→ Upload single Excel file

**"Run Optimization"** (After validation)
→ Optimize and save as scenario

### Scenarios Page:

**Checkbox** (Top-right of each card)
→ Select for comparison

**Pencil Icon** (Next to name)
→ Rename scenario

**"Edit"** (Button)
→ Open in table editor

**"View"** (Blue button, only if optimized)
→ See results and map

**"Copy"** (Button)
→ Duplicate scenario

**"Trash"** (Button)
→ Delete scenario

**"Compare (X)"** (Appears when 2+ selected)
→ Compare scenarios side-by-side

---

## SUMMARY: WHICH METHOD TO USE?

| Method | When to Use | Best For |
|--------|-------------|----------|
| **Upload Excel** | You have Excel files ready | Standard workflow, detailed data |
| **Multi-File Upload** | You have 2+ files to compare | Comparing months, quarters, versions |
| **Edit in App** | Quick changes, testing ideas | Small tweaks, what-if scenarios |
| **Rename** | Organize scenarios | Better names, fix typos |
| **Compare** | Understand differences | Finding best option, decision making |

---

## QUICK TIPS

💡 **Tip 1:** Use clear names like "Q1_2025_Base" instead of "test1"

💡 **Tip 2:** Multi-upload is fastest for comparing time periods

💡 **Tip 3:** Edit in app is best for quick cost changes

💡 **Tip 4:** Always compare inputs AND outputs to understand WHY results differ

💡 **Tip 5:** Keep a "baseline" scenario for reference

---

## TROUBLESHOOTING

**Q: I uploaded 3 files but only see 2 scenarios?**
A: One file might have failed validation. Check file format matches template.

**Q: Can I edit a scenario after optimization?**
A: Yes! Click "Edit" → make changes → "Save & Optimize" again

**Q: What happens to old optimization results when I edit?**
A: They're replaced with new results after re-optimization

**Q: Can I compare more than 3 scenarios?**
A: Currently limited to 3 for clarity, but you can do multiple comparisons

---

## ALL FEATURES WORKING

✓ Upload single Excel
✓ Upload multiple Excel files
✓ Edit data in app (no Excel needed)
✓ Save scenarios with names
✓ Rename scenarios anytime
✓ View saved scenarios
✓ Edit existing scenarios
✓ Duplicate scenarios
✓ Delete scenarios
✓ Compare 2-3 scenarios
✓ See input differences
✓ See output differences
✓ Side-by-side maps
✓ Download results as Excel

**Everything is ready to use!**