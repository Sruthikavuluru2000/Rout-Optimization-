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

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

geolocator = Nominatim(user_agent="route_optimizer_app")

class OptimizationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_cost: float
    routes_selected: List[Dict[str, Any]]
    summary_metrics: Dict[str, Any]
    city_coordinates: Dict[str, List[float]]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Scenario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    input_data: Dict[str, Any]
    optimization_results: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    input_data: Dict[str, Any]
    optimization_results: Optional[Dict[str, Any]] = None

class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    optimization_results: Optional[Dict[str, Any]] = None

def geocode_city(city_name: str) -> Optional[tuple]:
    try:
        location = geolocator.geocode(f"{city_name}, India")
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        logging.warning(f"Geocoding failed for {city_name}: {e}")
    return None

def parse_excel_file(file_path: str) -> Dict[str, Any]:
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    logging.info(f"Sheet names found: {sheet_names}")
    
    # Try to detect format
    if "Cities" in sheet_names and "Route_Cities" in sheet_names:
        # Read warehouse if exists
        warehouse_name = None
        warehouse_lat = None
        warehouse_long = None
        
        if "Warehouse" in sheet_names:
            warehouse_df = pd.read_excel(xl, "Warehouse")
            if len(warehouse_df) > 0:
                warehouse_name = warehouse_df["warehouse"].iloc[0]
                warehouse_lat = float(warehouse_df["lat"].iloc[0])
                warehouse_long = float(warehouse_df["long"].iloc[0])
                logging.info(f"Warehouse found: {warehouse_name} at ({warehouse_lat}, {warehouse_long})")
        
        cities_df = pd.read_excel(xl, "Cities")
        route_cities_df = pd.read_excel(xl, "Route_Cities")
        route_trucktypes_df = pd.read_excel(xl, "Route_TruckTypes")
        
        cities = cities_df["city"].tolist()
        demand = dict(zip(cities_df["city"], cities_df["demand"]))
        logging.info(f"Parsed {len(cities)} cities")
        
        if "lat" in cities_df.columns and "long" in cities_df.columns:
            lat_dict = dict(zip(cities_df["city"], cities_df["lat"]))
            long_dict = dict(zip(cities_df["city"], cities_df["long"]))
        else:
            lat_dict = {}
            long_dict = {}
            for city in cities:
                coords = geocode_city(city)
                if coords:
                    lat_dict[city] = coords[0]
                    long_dict[city] = coords[1]
        
        routes = list(set(route_cities_df["route"]))
        truck_types = list(set(route_trucktypes_df["truck_type"]))
        logging.info(f"Parsed {len(routes)} routes and {len(truck_types)} truck types")
        
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
        raise HTTPException(status_code=400, detail="Unsupported Excel format. Expected sheets: Warehouse (optional), Cities, Route_Cities, Route_TruckTypes")
    
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
        "cost": cost,
        "warehouse": {
            "name": warehouse_name,
            "lat": warehouse_lat,
            "long": warehouse_long
        } if warehouse_name else None
    }

def haversine(coord1: tuple, coord2: tuple) -> float:
    R = 6371
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def sort_cities_nearest_neighbor(cities: List[str], coords: Dict[str, tuple], start: Optional[str] = None) -> List[str]:
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
    cities = data["cities"]
    demand = data["demand"]
    routes = data["routes"]
    route_cities = data["route_cities"]
    route_trucktypes = data["route_trucktypes"]
    capacity = data["capacity"]
    cost = data["cost"]
    lat_dict = data["lat_dict"]
    long_dict = data["long_dict"]
    
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        raise HTTPException(status_code=500, detail="SCIP solver not available")
    
    x = {}
    y = {}
    
    for rt in route_trucktypes:
        x[rt] = solver.IntVar(0, solver.infinity(), f'x_{rt}')
        for c in route_cities[rt[0]]:
            y[rt, c] = solver.NumVar(0, solver.infinity(), f'y_{rt}_{c}')
    
    for c in cities:
        solver.Add(
            sum(y[rt, c] for rt in route_trucktypes if c in route_cities[rt[0]]) >= demand[c]
        )
    
    for rt in route_trucktypes:
        r = rt[0]
        solver.Add(
            sum(y[rt, c] for c in route_cities[r]) <= x[rt] * capacity[rt]
        )
    
    solver.Minimize(
        sum(cost[rt] * x[rt] for rt in route_trucktypes)
    )
    
    status = solver.Solve()
    
    if status != pywraplp.Solver.OPTIMAL:
        raise HTTPException(status_code=500, detail="No optimal solution found")
    
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
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        data = parse_excel_file(tmp_path)
        
        serializable_data = data.copy()
        serializable_data["route_trucktypes"] = [[rt[0], rt[1]] for rt in data["route_trucktypes"]]
        
        serializable_data["capacity"] = {f"{k[0]}|{k[1]}": v for k, v in data["capacity"].items()}
        serializable_data["cost"] = {f"{k[0]}|{k[1]}": v for k, v in data["cost"].items()}
        
        import math
        for key in ['lat_dict', 'long_dict']:
            serializable_data[key] = {
                k: (v if isinstance(v, (int, float)) and math.isfinite(v) else 0)
                for k, v in serializable_data[key].items()
            }
        
        return {
            "success": True,
            "message": "File uploaded and validated successfully",
            "data": {
                "cities_count": len(data["cities"]),
                "routes_count": len(data["routes"]),
                "truck_types": data["truck_types"],
                "warehouse": data.get("warehouse")
            },
            "file_data": serializable_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing Excel: {str(e)}")
    finally:
        os.unlink(tmp_path)

@api_router.post("/optimize")
async def run_optimization(file_data: Dict[str, Any]):
    try:
        processed_data = file_data.copy()
        
        if processed_data.get("route_trucktypes") and isinstance(processed_data["route_trucktypes"][0], list):
            processed_data["route_trucktypes"] = [(rt[0], rt[1]) for rt in processed_data["route_trucktypes"]]
        
        if isinstance(list(processed_data.get("capacity", {}).keys())[0], str):
            processed_data["capacity"] = {tuple(k.split("|")): v for k, v in processed_data["capacity"].items()}
            processed_data["cost"] = {tuple(k.split("|")): v for k, v in processed_data["cost"].items()}
        
        result = optimize_routes(processed_data)
        
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
    try:
        output_path = f"/tmp/optimization_results_{uuid.uuid4()}.xlsx"
        workbook = xlsxwriter.Workbook(output_path)
        
        summary_sheet = workbook.add_worksheet("Summary")
        summary_sheet.write(0, 0, "Metric")
        summary_sheet.write(0, 1, "Value")
        
        metrics = results_data.get("summary_metrics", {})
        row = 1
        for key, value in metrics.items():
            summary_sheet.write(row, 0, key.replace("_", " ").title())
            summary_sheet.write(row, 1, value)
            row += 1
        
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

# Scenario Management Endpoints
@api_router.post("/scenarios", response_model=Scenario)
async def create_scenario(scenario: ScenarioCreate):
    scenario_obj = Scenario(**scenario.model_dump())
    doc = scenario_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.scenarios.insert_one(doc)
    return scenario_obj

@api_router.get("/scenarios", response_model=List[Scenario])
async def list_scenarios():
    scenarios = await db.scenarios.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for scenario in scenarios:
        if isinstance(scenario['created_at'], str):
            scenario['created_at'] = datetime.fromisoformat(scenario['created_at'])
        if isinstance(scenario['updated_at'], str):
            scenario['updated_at'] = datetime.fromisoformat(scenario['updated_at'])
    return scenarios

@api_router.get("/scenarios/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: str):
    scenario = await db.scenarios.find_one({"id": scenario_id}, {"_id": 0})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if isinstance(scenario['created_at'], str):
        scenario['created_at'] = datetime.fromisoformat(scenario['created_at'])
    if isinstance(scenario['updated_at'], str):
        scenario['updated_at'] = datetime.fromisoformat(scenario['updated_at'])
    return scenario

@api_router.put("/scenarios/{scenario_id}", response_model=Scenario)
async def update_scenario(scenario_id: str, update: ScenarioUpdate):
    scenario = await db.scenarios.find_one({"id": scenario_id}, {"_id": 0})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.scenarios.update_one({"id": scenario_id}, {"$set": update_data})
    
    updated_scenario = await db.scenarios.find_one({"id": scenario_id}, {"_id": 0})
    if isinstance(updated_scenario['created_at'], str):
        updated_scenario['created_at'] = datetime.fromisoformat(updated_scenario['created_at'])
    if isinstance(updated_scenario['updated_at'], str):
        updated_scenario['updated_at'] = datetime.fromisoformat(updated_scenario['updated_at'])
    return updated_scenario

@api_router.delete("/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str):
    result = await db.scenarios.delete_one({"id": scenario_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted successfully"}

@api_router.post("/scenarios/{scenario_id}/duplicate", response_model=Scenario)
async def duplicate_scenario(scenario_id: str, new_name: str):
    original = await db.scenarios.find_one({"id": scenario_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    duplicate_data = ScenarioCreate(
        name=new_name,
        description=f"Copy of {original['name']}",
        input_data=original["input_data"],
        optimization_results=None
    )
    
    new_scenario = Scenario(**duplicate_data.model_dump())
    doc = new_scenario.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.scenarios.insert_one(doc)
    return new_scenario

@api_router.post("/scenarios/compare")
async def compare_scenarios(scenario_ids: List[str]):
    if len(scenario_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 scenarios required for comparison")
    
    scenarios = []
    for scenario_id in scenario_ids:
        scenario = await db.scenarios.find_one({"id": scenario_id}, {"_id": 0})
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
        scenarios.append(scenario)
    
    comparison = {
        "scenarios": scenarios,
        "comparison_metrics": []
    }
    
    for scenario in scenarios:
        if scenario.get("optimization_results"):
            metrics = scenario["optimization_results"].get("summary_metrics", {})
            comparison["comparison_metrics"].append({
                "scenario_id": scenario["id"],
                "scenario_name": scenario["name"],
                "total_cost": metrics.get("total_cost", 0),
                "total_trucks": metrics.get("total_trucks", 0),
                "routes_optimized": metrics.get("routes_optimized", 0),
                "capacity_used": metrics.get("total_capacity_used", 0)
            })
    
    return comparison

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