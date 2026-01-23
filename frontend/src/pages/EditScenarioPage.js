import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EditScenarioPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scenario = location.state?.scenario;

  const [scenarioName, setScenarioName] = useState(scenario?.name || 'New Scenario');
  const [description, setDescription] = useState(scenario?.description || '');
  const [cities, setCities] = useState([]);
  const [routeCities, setRouteCities] = useState([]);
  const [routeTruckTypes, setRouteTruckTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (scenario?.input_data) {
      loadScenarioData(scenario.input_data);
    } else {
      // Initialize with empty data
      setCities([{ city: '', demand: 0, lat: '', long: '' }]);
      setRouteCities([{ route: '', city: '' }]);
      setRouteTruckTypes([{ route: '', truck_type: '', capacity: 0, cost: 0 }]);
    }
  }, [scenario]);

  const loadScenarioData = (inputData) => {
    // Convert input data to editable format
    const citiesArray = inputData.cities?.map(city => ({
      city: city,
      demand: inputData.demand?.[city] || 0,
      lat: inputData.lat_dict?.[city] || '',
      long: inputData.long_dict?.[city] || ''
    })) || [];

    const routeCitiesArray = [];
    Object.entries(inputData.route_cities || {}).forEach(([route, cities]) => {
      cities.forEach(city => {
        routeCitiesArray.push({ route, city });
      });
    });

    const routeTruckTypesArray = (inputData.route_trucktypes || []).map(([route, truck]) => {
      const key = `${route}|${truck}`;
      return {
        route,
        truck_type: truck,
        capacity: inputData.capacity?.[key] || 0,
        cost: inputData.cost?.[key] || 0
      };
    });

    setCities(citiesArray.length > 0 ? citiesArray : [{ city: '', demand: 0, lat: '', long: '' }]);
    setRouteCities(routeCitiesArray.length > 0 ? routeCitiesArray : [{ route: '', city: '' }]);
    setRouteTruckTypes(routeTruckTypesArray.length > 0 ? routeTruckTypesArray : [{ route: '', truck_type: '', capacity: 0, cost: 0 }]);
  };

  const addCity = () => {
    setCities([...cities, { city: '', demand: 0, lat: '', long: '' }]);
  };

  const removeCity = (index) => {
    setCities(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index, field, value) => {
    const updated = [...cities];
    updated[index][field] = value;
    setCities(updated);
  };

  const addRouteCity = () => {
    setRouteCities([...routeCities, { route: '', city: '' }]);
  };

  const removeRouteCity = (index) => {
    setRouteCities(routeCities.filter((_, i) => i !== index));
  };

  const updateRouteCity = (index, field, value) => {
    const updated = [...routeCities];
    updated[index][field] = value;
    setRouteCities(updated);
  };

  const addRouteTruckType = () => {
    setRouteTruckTypes([...routeTruckTypes, { route: '', truck_type: '', capacity: 0, cost: 0 }]);
  };

  const removeRouteTruckType = (index) => {
    setRouteTruckTypes(routeTruckTypes.filter((_, i) => i !== index));
  };

  const updateRouteTruckType = (index, field, value) => {
    const updated = [...routeTruckTypes];
    updated[index][field] = value;
    setRouteTruckTypes(updated);
  };

  const convertToInputData = () => {
    // Convert editable format back to input_data format
    const cityList = cities.map(c => c.city).filter(c => c);
    const demand = {};
    const lat_dict = {};
    const long_dict = {};

    cities.forEach(c => {
      if (c.city) {
        demand[c.city] = parseFloat(c.demand) || 0;
        if (c.lat) lat_dict[c.city] = parseFloat(c.lat);
        if (c.long) long_dict[c.city] = parseFloat(c.long);
      }
    });

    const routeCitiesMap = {};
    routeCities.forEach(rc => {
      if (rc.route && rc.city) {
        if (!routeCitiesMap[rc.route]) routeCitiesMap[rc.route] = [];
        routeCitiesMap[rc.route].push(rc.city);
      }
    });

    const routes = Object.keys(routeCitiesMap);
    const truck_types = [...new Set(routeTruckTypes.map(rt => rt.truck_type).filter(t => t))];
    
    const route_trucktypes = routeTruckTypes
      .filter(rt => rt.route && rt.truck_type)
      .map(rt => [rt.route, rt.truck_type]);

    const capacity = {};
    const cost = {};
    routeTruckTypes.forEach(rt => {
      if (rt.route && rt.truck_type) {
        const key = `${rt.route}|${rt.truck_type}`;
        capacity[key] = parseFloat(rt.capacity) || 0;
        cost[key] = parseFloat(rt.cost) || 0;
      }
    });

    return {
      cities: cityList,
      demand,
      lat_dict,
      long_dict,
      routes,
      truck_types,
      route_cities: routeCitiesMap,
      route_trucktypes,
      capacity,
      cost
    };
  };

  const handleSave = async () => {
    if (!scenarioName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }

    setSaving(true);
    try {
      const inputData = convertToInputData();
      
      const scenarioData = {
        name: scenarioName,
        description,
        input_data: inputData,
        optimization_results: scenario?.optimization_results || null
      };

      if (scenario?.id) {
        await axios.put(`${API}/scenarios/${scenario.id}`, scenarioData);
        toast.success('Scenario updated successfully!');
      } else {
        await axios.post(`${API}/scenarios`, scenarioData);
        toast.success('Scenario created successfully!');
      }

      navigate('/scenarios');
    } catch (error) {
      toast.error('Failed to save scenario');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleOptimize = async () => {
    setSaving(true);
    try {
      const inputData = convertToInputData();
      const response = await axios.post(`${API}/optimize`, inputData);
      
      // Save scenario with results
      const scenarioData = {
        name: scenarioName,
        description,
        input_data: inputData,
        optimization_results: response.data
      };

      if (scenario?.id) {
        await axios.put(`${API}/scenarios/${scenario.id}`, scenarioData);
      } else {
        await axios.post(`${API}/scenarios`, scenarioData);
      }

      toast.success('Optimization completed!');
      navigate('/results', { state: { data: response.data, scenarioName } });
    } catch (error) {
      toast.error('Optimization failed');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {scenario?.id ? 'EDIT SCENARIO' : 'CREATE SCENARIO'}
          </h1>
          <p className="text-sm text-slate-600">Edit your route data directly in the app</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/scenarios')}
            className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleOptimize}
            disabled={saving}
            className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save & Optimize
          </button>
        </div>
      </div>

      {/* Scenario Details */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>SCENARIO DETAILS</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Scenario Name *</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Q1 2025 Routes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>CITIES</h2>
          <button onClick={addCity} className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add City
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 text-left">City Name</th>
                <th className="p-3 text-left">Demand</th>
                <th className="p-3 text-left">Latitude (optional)</th>
                <th className="p-3 text-left">Longitude (optional)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-3">
                    <input
                      type="text"
                      value={city.city}
                      onChange={(e) => updateCity(idx, 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="Mumbai"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={city.demand}
                      onChange={(e) => updateCity(idx, 'demand', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="1000"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={city.lat}
                      onChange={(e) => updateCity(idx, 'lat', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="19.0760"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={city.long}
                      onChange={(e) => updateCity(idx, 'long', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="72.8777"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => removeCity(idx)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route Cities Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>ROUTE CITIES</h2>
          <button onClick={addRouteCity} className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Route City
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 text-left">Route ID</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {routeCities.map((rc, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-3">
                    <input
                      type="text"
                      value={rc.route}
                      onChange={(e) => updateRouteCity(idx, 'route', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="R1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={rc.city}
                      onChange={(e) => updateRouteCity(idx, 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="Mumbai"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => removeRouteCity(idx)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route Truck Types Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>ROUTE TRUCK TYPES</h2>
          <button onClick={addRouteTruckType} className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Route Truck
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 text-left">Route ID</th>
                <th className="p-3 text-left">Truck Type</th>
                <th className="p-3 text-left">Capacity</th>
                <th className="p-3 text-left">Cost</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {routeTruckTypes.map((rt, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-3">
                    <input
                      type="text"
                      value={rt.route}
                      onChange={(e) => updateRouteTruckType(idx, 'route', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="R1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={rt.truck_type}
                      onChange={(e) => updateRouteTruckType(idx, 'truck_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="T1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={rt.capacity}
                      onChange={(e) => updateRouteTruckType(idx, 'capacity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="2000"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={rt.cost}
                      onChange={(e) => updateRouteTruckType(idx, 'cost', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="30000"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => removeRouteTruckType(idx)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EditScenarioPage;