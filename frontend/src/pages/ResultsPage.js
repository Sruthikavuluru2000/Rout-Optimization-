import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { Download, TrendingUp, Truck, MapPin, DollarSign, Package, ArrowLeft } from 'lucide-react';
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

const ResultsPage = ({ data, onReset }) => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!data) {
      navigate('/');
    }
  }, [data, navigate]);

  if (!data) {
    return null;
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await axios.post(`${API}/export-results`, data, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'optimization_results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Results exported successfully!');
    } catch (error) {
      toast.error('Failed to export results');
      console.error('Export error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    onReset();
    navigate('/');
  };

  const { summary_metrics, routes_selected, city_coordinates } = data;

  // Calculate map center
  const cityCoords = Object.values(city_coordinates || {});
  const mapCenter = cityCoords.length > 0
    ? [
        cityCoords.reduce((sum, c) => sum + c[0], 0) / cityCoords.length,
        cityCoords.reduce((sum, c) => sum + c[1], 0) / cityCoords.length,
      ]
    : [20.5937, 78.9629];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }} data-testid="results-title">
            OPTIMIZATION RESULTS
          </h1>
          <p className="text-sm text-slate-600">Your optimized route and truck allocation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
            data-testid="reset-button"
          >
            <ArrowLeft className="w-4 h-4" />
            New Optimization
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-4 py-2 font-medium transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            data-testid="download-button"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Exporting...' : 'Export Results'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col gap-1 hover:border-slate-300 transition-colors" data-testid="metric-total-cost">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Total Cost</p>
          </div>
          <p className="text-3xl font-mono font-bold text-slate-900">₹{summary_metrics?.total_cost?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col gap-1 hover:border-slate-300 transition-colors" data-testid="metric-total-trucks">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Truck className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Total Trucks</p>
          </div>
          <p className="text-3xl font-mono font-bold text-slate-900">{summary_metrics?.total_trucks?.toFixed(1) || 0}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col gap-1 hover:border-slate-300 transition-colors" data-testid="metric-routes">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <MapPin className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Routes Optimized</p>
          </div>
          <p className="text-3xl font-mono font-bold text-slate-900">{summary_metrics?.routes_optimized || 0}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col gap-1 hover:border-slate-300 transition-colors" data-testid="metric-capacity">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Package className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Capacity Used</p>
          </div>
          <p className="text-3xl font-mono font-bold text-slate-900">{summary_metrics?.total_capacity_used?.toFixed(0) || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm" data-testid="map-container">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>ROUTE VISUALIZATION</h2>
          </div>
          <div className="h-[500px] w-full rounded-b-xl overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              data-testid="leaflet-map"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              
              {routes_selected?.map((route, idx) => {
                const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                const cities = route.sorted_cities || [];
                const coords = cities
                  .map(city => city_coordinates?.[city])
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

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm" data-testid="routes-table-container">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>SELECTED ROUTES</h2>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Route</th>
                  <th className="p-3 text-left">Truck</th>
                  <th className="p-3 text-right">Count</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">Util %</th>
                </tr>
              </thead>
              <tbody>
                {routes_selected?.map((route, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-sm text-slate-700 font-medium">{route.route_id}</td>
                    <td className="p-3 text-sm text-slate-700">{route.truck_type}</td>
                    <td className="p-3 text-sm text-slate-700 font-mono text-right">{route.trucks_used?.toFixed(1)}</td>
                    <td className="p-3 text-sm text-slate-700 font-mono text-right">₹{route.total_cost?.toLocaleString()}</td>
                    <td className="p-3 text-sm text-slate-700 font-mono text-right">{route.capacity_utilization?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm" data-testid="city-deliveries-container">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>CITY DELIVERIES</h2>
        </div>
        <div className="overflow-auto" style={{ maxHeight: '400px' }}>
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3 text-left">Route</th>
                <th className="p-3 text-left">Truck Type</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Demand</th>
              </tr>
            </thead>
            <tbody>
              {routes_selected?.map((route) =>
                route.cities_delivered?.map((city, idx) => (
                  <tr key={`${route.route_id}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-sm text-slate-700 font-medium">{route.route_id}</td>
                    <td className="p-3 text-sm text-slate-700">{route.truck_type}</td>
                    <td className="p-3 text-sm text-slate-700">{city.city}</td>
                    <td className="p-3 text-sm text-slate-700 font-mono text-right">{city.quantity?.toFixed(2)}</td>
                    <td className="p-3 text-sm text-slate-700 font-mono text-right">{city.demand}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;