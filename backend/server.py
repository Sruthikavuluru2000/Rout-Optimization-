from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
import pandas as pd
import openpyxl
from ortools.linear_solver import pywraplp
import json
import math
from geopy.geocoders import Nominatim
import tempfile
import xlsxwriter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Geocoding service
geolocator = Nominatim(user_agent="route_optimizer_app")

class OptimizationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_cost: float
    routes_selected: List[Dict[str, Any]]
    summary_metrics: Dict[str, Any]
    city_coordinates: Dict[str, List[float]]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def geocode_city(city_name: str) -> Optional[tuple]:
    """Geocode city name to lat/long"""
    try:
        location = geolocator.geocode(f"{city_name}, India")
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        logging.warning(f"Geocoding failed for {city_name}: {e}")
    return None

def parse_excel_file(file_path: str) -> Dict[str, Any]:
    """Parse uploaded Excel file and return structured data"""
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    
    # Try to detect format
    if "Cities" in sheet_names and "Route_Cities" in sheet_names:
        # Format from first notebook (normalized)
        cities_df = pd.read_excel(xl, "Cities")
        route_cities_df = pd.read_excel(xl, "Route_Cities")
        route_trucktypes_df = pd.read_excel(xl, "Route_TruckTypes")
        
        cities = cities_df["city"].tolist()
        demand = dict(zip(cities_df["city"], cities_df["demand"]))
        
        # Check if lat/long exist
        if "lat" in cities_df.columns and "long" in cities_df.columns:
            lat_dict = dict(zip(cities_df["city"], cities_df["lat"]))
            long_dict = dict(zip(cities_df["city"], cities_df["long"]))
        else:
            # Geocode cities
            lat_dict = {}
            long_dict = {}
            for city in cities:
                coords = geocode_city(city)
                if coords:
                    lat_dict[city] = coords[0]
                    long_dict[city] = coords[1]
        
        routes = list(set(route_cities_df["route"]))
        truck_types = list(set(route_trucktypes_df["truck_type"]))
        
        route_cities = {}
        for _, row in route_cities_df.iterrows():
            route_cities.setdefault(row["route"], []).append(row["city"])
        
        route_trucktypes = [(i[0], i[1]) for i in list(route_trucktypes_df[["route", "truck_type"]].itertuples(index=False, name=None))]
        
        capacity = {}
        cost = {}
        for _, row in route_trucktypes_df.iterrows():
            key = (row["route"], row["truck_type"])
            capacity[key] = int(row["capacity"])
            cost[key] = int(row["cost"])
            
    else:
        raise HTTPException(status_code=400, detail="Unsupported Excel format. Expected sheets: Cities, Route_Cities, Route_TruckTypes")
    
    return {
        "cities": cities,
        "demand": demand,
        "lat_dict": lat_dict,
        "long_dict": long_dict,
        "routes": routes,
        "truck_types": truck_types,
        "route_cities": route_cities,
        "route_trucktypes": route_trucktypes,
        "capacity": capacity,
        "cost": cost
    }

def haversine(coord1: tuple, coord2: tuple) -> float:
    """Calculate distance between two coordinates in km"""
    R = 6371
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def sort_cities_nearest_neighbor(cities: List[str], coords: Dict[str, tuple], start: Optional[str] = None) -> List[str]:
    """Order cities using nearest neighbor heuristic"""
    if not cities:
        return []
    
    unvisited = set(cities)
    current = start if start and start in cities else cities[0]
    route = [current]
    unvisited.remove(current)
    
    while unvisited:
        next_city = min(
            unvisited,
            key=lambda city: haversine(coords[current], coords[city])
        )
        route.append(next_city)
        unvisited.remove(next_city)
        current = next_city
    
    return route

def optimize_routes(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run OR-Tools optimization"""
    cities = data["cities"]
    demand = data["demand"]
    routes = data["routes"]
    route_cities = data["route_cities"]
    route_trucktypes = data["route_trucktypes"]
    capacity = data["capacity"]
    cost = data["cost"]
    lat_dict = data["lat_dict"]
    long_dict = data["long_dict"]
    
    # Build OR-Tools model
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        raise HTTPException(status_code=500, detail="SCIP solver not available")
    
    x = {}
    y = {}
    
    # Decision variables
    for rt in route_trucktypes:
        x[rt] = solver.IntVar(0, solver.infinity(), f'x_{rt}')
        for c in route_cities[rt[0]]:
            y[rt, c] = solver.NumVar(0, solver.infinity(), f'y_{rt}_{c}')
    
    # Constraint: Demand satisfaction
    for c in cities:
        solver.Add(
            sum(y[rt, c] for rt in route_trucktypes if c in route_cities[rt[0]]) >= demand[c]
        )
    
    # Constraint: Route capacity
    for rt in route_trucktypes:
        r = rt[0]
        solver.Add(
            sum(y[rt, c] for c in route_cities[r]) <= x[rt] * capacity[rt]
        )
    
    # Objective: Minimize cost
    solver.Minimize(
        sum(cost[rt] * x[rt] for rt in route_trucktypes)
    )
    
    # Solve
    status = solver.Solve()
    
    if status != pywraplp.Solver.OPTIMAL:
        raise HTTPException(status_code=500, detail="No optimal solution found")
    
    # Extract results
    routes_selected = []
    total_trucks = 0
    total_capacity_used = 0
    total_demand = sum(demand.values())
    
    for rt in route_trucktypes:
        trucks_used = x[rt].solution_value()
        if trucks_used > 0:
            route_id = rt[0]
            truck_type = rt[1]
            
            cities_delivered = []
            total_delivered = 0
            
            coords = {c: (lat_dict.get(c, 0), long_dict.get(c, 0)) for c in route_cities[route_id]}
            
            for c in route_cities[route_id]:
                qty = y[rt, c].solution_value()
                if qty > 0:
                    cities_delivered.append({
                        "city": c,
                        "quantity": round(qty, 2),
                        "demand": demand.get(c, 0)
                    })
                    total_delivered += qty
            
            if cities_delivered:
                # Sort cities by nearest neighbor
                city_names = [cd["city"] for cd in cities_delivered]
                sorted_cities = sort_cities_nearest_neighbor(city_names, coords)
                
                routes_selected.append({
                    "route_id": route_id,
                    "truck_type": truck_type,
                    "trucks_used": round(trucks_used, 2),
                    "capacity": capacity[rt],
                    "cost_per_truck": cost[rt],
                    "total_cost": round(cost[rt] * trucks_used, 2),
                    "cities_delivered": cities_delivered,
                    "sorted_cities": sorted_cities,
                    "total_delivered": round(total_delivered, 2),
                    "capacity_utilization": round((total_delivered / (trucks_used * capacity[rt])) * 100, 2)
                })
                
                total_trucks += trucks_used
                total_capacity_used += total_delivered
    
    # Prepare city coordinates for map
    city_coordinates = {}
    for city in cities:
        if city in lat_dict and city in long_dict:
            city_coordinates[city] = [lat_dict[city], long_dict[city]]
    
    summary_metrics = {
        "total_cost": round(solver.Objective().Value(), 2),
        "total_trucks": round(total_trucks, 2),
        "total_demand": total_demand,
        "total_capacity_used": round(total_capacity_used, 2),
        "routes_optimized": len(routes_selected),
        "cities_served": len([c for r in routes_selected for c in r["cities_delivered"]])
    }
    
    return {
        "total_cost": summary_metrics["total_cost"],
        "routes_selected": routes_selected,
        "summary_metrics": summary_metrics,
        "city_coordinates": city_coordinates
    }

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Upload and parse Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    # Save temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        data = parse_excel_file(tmp_path)
        
        # Convert tuples to lists/strings for JSON serialization
        serializable_data = data.copy()
        serializable_data["route_trucktypes"] = [[rt[0], rt[1]] for rt in data["route_trucktypes"]]
        
        # Convert tuple keys to string keys for capacity and cost
        serializable_data["capacity"] = {f"{k[0]}|{k[1]}": v for k, v in data["capacity"].items()}
        serializable_data["cost"] = {f"{k[0]}|{k[1]}": v for k, v in data["cost"].items()}
        
        # Store in session or return validation result
        return {
            "success": True,
            "message": "File uploaded and validated successfully",
            "data": {
                "cities_count": len(data["cities"]),
                "routes_count": len(data["routes"]),
                "truck_types": data["truck_types"]
            },
            "file_data": serializable_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing Excel: {str(e)}")
    finally:
        os.unlink(tmp_path)

@api_router.post("/optimize")
async def run_optimization(file_data: Dict[str, Any]):
    """Run route optimization"""
    try:
        # Convert route_trucktypes back to tuples if they were serialized as lists
        if file_data.get("route_trucktypes") and isinstance(file_data["route_trucktypes"][0], list):
            file_data["route_trucktypes"] = [(rt[0], rt[1]) for rt in file_data["route_trucktypes"]]
        
        result = optimize_routes(file_data)
        
        # Save to database
        result_obj = OptimizationResult(**result)
        doc = result_obj.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.optimization_results.insert_one(doc)
        
        return result
    except Exception as e:
        logging.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@api_router.post("/export-results")
async def export_results(results_data: Dict[str, Any]):
    """Export optimization results to Excel"""
    try:
        # Create Excel file
        output_path = f"/tmp/optimization_results_{uuid.uuid4()}.xlsx"
        workbook = xlsxwriter.Workbook(output_path)
        
        # Summary sheet
        summary_sheet = workbook.add_worksheet("Summary")
        summary_sheet.write(0, 0, "Metric")
        summary_sheet.write(0, 1, "Value")
        
        metrics = results_data.get("summary_metrics", {})
        row = 1
        for key, value in metrics.items():
            summary_sheet.write(row, 0, key.replace("_", " ").title())
            summary_sheet.write(row, 1, value)
            row += 1
        
        # Routes sheet
        routes_sheet = workbook.add_worksheet("Routes")
        headers = ["Route ID", "Truck Type", "Trucks Used", "Capacity", "Cost per Truck", "Total Cost", "Total Delivered", "Capacity Utilization %"]
        for col, header in enumerate(headers):
            routes_sheet.write(0, col, header)
        
        row = 1
        for route in results_data.get("routes_selected", []):
            routes_sheet.write(row, 0, route["route_id"])
            routes_sheet.write(row, 1, route["truck_type"])
            routes_sheet.write(row, 2, route["trucks_used"])
            routes_sheet.write(row, 3, route["capacity"])
            routes_sheet.write(row, 4, route["cost_per_truck"])
            routes_sheet.write(row, 5, route["total_cost"])
            routes_sheet.write(row, 6, route["total_delivered"])
            routes_sheet.write(row, 7, route["capacity_utilization"])
            row += 1
        
        # City deliveries sheet
        deliveries_sheet = workbook.add_worksheet("City Deliveries")
        deliveries_sheet.write(0, 0, "Route ID")
        deliveries_sheet.write(0, 1, "Truck Type")
        deliveries_sheet.write(0, 2, "City")
        deliveries_sheet.write(0, 3, "Quantity Delivered")
        deliveries_sheet.write(0, 4, "City Demand")
        
        row = 1
        for route in results_data.get("routes_selected", []):
            for city_data in route["cities_delivered"]:
                deliveries_sheet.write(row, 0, route["route_id"])
                deliveries_sheet.write(row, 1, route["truck_type"])
                deliveries_sheet.write(row, 2, city_data["city"])
                deliveries_sheet.write(row, 3, city_data["quantity"])
                deliveries_sheet.write(row, 4, city_data["demand"])
                row += 1
        
        workbook.close()
        
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="optimization_results.xlsx"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "Route Optimization API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()