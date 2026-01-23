# Route Optimization App - User Guide

## Quick Start

### Option 1: Download Template (Recommended)
1. Click the **"Download Template"** button at the top right of the dashboard
2. Open the downloaded Excel file
3. You'll see 4 sheets:
   - **Instructions**: Read this first for detailed guidance
   - **Cities**: Add your cities with demand (lat/long optional)
   - **Route_Cities**: Define which cities are covered by each route
   - **Route_TruckTypes**: Specify truck types, capacity, and costs per route

### Option 2: Create Your Own Excel File
Your Excel file must have exactly these 3 sheets:

#### Sheet 1: Cities
| city      | demand | lat (optional) | long (optional) |
|-----------|--------|----------------|-----------------|
| Mumbai    | 1000   | 19.0760        | 72.8777         |
| Delhi     | 1200   | 28.7041        | 77.1025         |
| Bangalore | 800    | 12.9716        | 77.5946         |

**Note:** If you don't provide lat/long, cities will be automatically geocoded

#### Sheet 2: Route_Cities
| route | city      |
|-------|-----------|
| R1    | Mumbai    |
| R1    | Delhi     |
| R1    | Bangalore |
| R2    | Chennai   |
| R2    | Kolkata   |

#### Sheet 3: Route_TruckTypes
| route | truck_type | capacity | cost  |
|-------|------------|----------|-------|
| R1    | T1         | 2000     | 30000 |
| R1    | T2         | 1500     | 25000 |
| R2    | T1         | 2000     | 28000 |
| R2    | T2         | 1500     | 23000 |

## How to Use

1. **Upload File**: 
   - Drag and drop your Excel file OR click to browse
   - File will be automatically validated

2. **Review Validation**: 
   - Check cities count, routes count, and truck types
   - If validation fails, check your Excel format

3. **Run Optimization**: 
   - Click "Run Optimization" button
   - OR-Tools will find the most cost-effective route and truck allocation

4. **View Results**:
   - See summary metrics (total cost, trucks, capacity utilization)
   - View selected routes in detailed table
   - Check city deliveries breakdown
   - Interactive map shows all routes with color-coded paths

5. **Export Results**:
   - Click "Export Results" to download optimized plan as Excel
   - Share with your team or import into logistics system

## Features

✓ **Cost Minimization**: Uses OR-Tools SCIP solver to find optimal solution
✓ **Auto-Geocoding**: Cities without coordinates are automatically located
✓ **Interactive Map**: Visualize routes with Leaflet maps
✓ **Capacity Planning**: Ensures all city demands are met
✓ **Multiple Truck Types**: Supports different truck capacities and costs
✓ **Excel Export**: Download complete optimization results

## Troubleshooting

**"Failed to upload"**
- Ensure your file is .xlsx or .xls format
- Check that all 3 required sheets exist with correct names
- Verify column names match exactly (case-sensitive)
- Make sure numeric values (demand, capacity, cost) don't have text

**"No optimal solution found"**
- Check if total truck capacity is sufficient for total demand
- Ensure each city is covered by at least one route
- Verify capacity and cost values are realistic

**"Geocoding failed"**
- Provide lat/long coordinates in the Cities sheet
- Ensure city names are spelled correctly for auto-geocoding

## Sample Data

The template includes realistic sample data:
- 6 cities with varying demands
- 3 routes covering different city combinations
- 2 truck types (T1: high capacity, T2: lower capacity/cost)

You can modify this data or replace it entirely with your own.

## Technical Details

- **Backend**: FastAPI + OR-Tools + Python
- **Frontend**: React + Leaflet Maps
- **Optimization**: SCIP solver with linear programming
- **Objective**: Minimize total transportation cost
- **Constraints**: 
  - Demand satisfaction for all cities
  - Capacity limits per truck per route
