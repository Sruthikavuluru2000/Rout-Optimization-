import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ROUTE_COLORS = [
  '#3B82F6',
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
];

const ComparePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location.state?.scenarioIds) {
      navigate('/scenarios');
      return;
    }
    loadComparison();
  }, []);

  const loadComparison = async () => {
    try {
      const response = await axios.post(`${API}/scenarios/compare`, location.state.scenarioIds);
      setComparison(response.data);
    } catch (error) {
      toast.error('Failed to load comparison');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDifference = (value1, value2) => {
    if (!value1 || !value2) return { percent: 0, direction: 'neutral' };
    const diff = ((value2 - value1) / value1) * 100;
    return {
      percent: Math.abs(diff).toFixed(1),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-slate-600">Loading comparison...</p>
      </div>
    );
  }

  if (!comparison || comparison.scenarios.length < 2) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Unable to load comparison data</p>
      </div>
    );
  }

  const hasResults = comparison.scenarios.every(s => s.optimization_results);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            SCENARIO COMPARISON
          </h1>
          <p className="text-sm text-slate-600">Compare optimization results side by side</p>
        </div>
        <button
          onClick={() => navigate('/scenarios')}
          className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scenarios
        </button>
      </div>

      {!hasResults && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">Some scenarios have not been optimized yet. Only input data will be compared.</p>
        </div>
      )}

      {/* Metrics Comparison */}
      {hasResults && (
        <div className="mb-8 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            METRICS COMPARISON
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">Metric</th>
                  {comparison.comparison_metrics.map((metric, idx) => (
                    <th key={idx} className="p-3 text-right">{metric.scenario_name}</th>
                  ))}
                  {comparison.comparison_metrics.length === 2 && (
                    <th className="p-3 text-right">Difference</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-medium text-slate-700">Total Cost</td>
                  {comparison.comparison_metrics.map((metric, idx) => (
                    <td key={idx} className="p-3 text-sm font-mono text-right text-slate-900">
                      ₹{metric.total_cost?.toLocaleString() || 0}
                    </td>
                  ))}
                  {comparison.comparison_metrics.length === 2 && (
                    <td className="p-3 text-sm text-right">
                      {(() => {
                        const diff = calculateDifference(
                          comparison.comparison_metrics[0].total_cost,
                          comparison.comparison_metrics[1].total_cost
                        );
                        return (
                          <span className={`inline-flex items-center gap-1 ${
                            diff.direction === 'up' ? 'text-red-600' : diff.direction === 'down' ? 'text-green-600' : 'text-slate-600'
                          }`}>
                            {diff.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                             diff.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                             <Minus className="w-4 h-4" />}
                            {diff.percent}%
                          </span>
                        );
                      })()}
                    </td>
                  )}
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-medium text-slate-700">Total Trucks</td>
                  {comparison.comparison_metrics.map((metric, idx) => (
                    <td key={idx} className="p-3 text-sm font-mono text-right text-slate-900">
                      {metric.total_trucks?.toFixed(1) || 0}
                    </td>
                  ))}
                  {comparison.comparison_metrics.length === 2 && (
                    <td className="p-3 text-sm text-right">
                      {(() => {
                        const diff = calculateDifference(
                          comparison.comparison_metrics[0].total_trucks,
                          comparison.comparison_metrics[1].total_trucks
                        );
                        return (
                          <span className={`inline-flex items-center gap-1 ${
                            diff.direction === 'up' ? 'text-red-600' : diff.direction === 'down' ? 'text-green-600' : 'text-slate-600'
                          }`}>
                            {diff.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                             diff.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                             <Minus className="w-4 h-4" />}
                            {diff.percent}%
                          </span>
                        );
                      })()}
                    </td>
                  )}
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-medium text-slate-700">Routes Optimized</td>
                  {comparison.comparison_metrics.map((metric, idx) => (
                    <td key={idx} className="p-3 text-sm font-mono text-right text-slate-900">
                      {metric.routes_optimized || 0}
                    </td>
                  ))}
                  {comparison.comparison_metrics.length === 2 && <td className="p-3"></td>}
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-medium text-slate-700">Capacity Used</td>
                  {comparison.comparison_metrics.map((metric, idx) => (
                    <td key={idx} className="p-3 text-sm font-mono text-right text-slate-900">
                      {metric.capacity_used?.toFixed(0) || 0}
                    </td>
                  ))}
                  {comparison.comparison_metrics.length === 2 && <td className="p-3"></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side by Side Maps */}
      {hasResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comparison.scenarios.map((scenario, idx) => {
            const results = scenario.optimization_results;
            if (!results) return null;

            const cityCoords = Object.values(results.city_coordinates || {});
            const mapCenter = cityCoords.length > 0
              ? [
                  cityCoords.reduce((sum, c) => sum + c[0], 0) / cityCoords.length,
                  cityCoords.reduce((sum, c) => sum + c[1], 0) / cityCoords.length,
                ]
              : [20.5937, 78.9629];

            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">{scenario.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Cost: ₹{results.summary_metrics?.total_cost?.toLocaleString() || 0} | 
                    Trucks: {results.summary_metrics?.total_trucks?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="h-[400px] w-full">
                  <MapContainer
                    center={mapCenter}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {results.routes_selected?.map((route, routeIdx) => {
                      const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
                      const cities = route.sorted_cities || [];
                      const coords = cities
                        .map(city => results.city_coordinates?.[city])
                        .filter(c => c);

                      return (
                        <div key={route.route_id}>
                          {coords.length > 1 && (
                            <Polyline
                              positions={coords}
                              color={color}
                              weight={3}
                              opacity={0.8}
                            />
                          )}
                          {coords.map((coord, i) => (
                            <CircleMarker
                              key={i}
                              center={coord}
                              radius={6}
                              fillColor={color}
                              color="white"
                              weight={2}
                              fillOpacity={0.9}
                            >
                              <Popup>
                                <div className="text-xs">
                                  <strong>{cities[i]}</strong><br />
                                  Route: {route.route_id}<br />
                                  Truck: {route.truck_type}
                                </div>
                              </Popup>
                            </CircleMarker>
                          ))}
                        </div>
                      );
                    })}
                  </MapContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComparePage;