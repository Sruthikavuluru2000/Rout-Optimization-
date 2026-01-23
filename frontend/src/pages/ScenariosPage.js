import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Copy, Trash2, Play, BarChart3, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ScenariosPage = ({ onLoadScenario }) => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await axios.get(`${API}/scenarios`);
      setScenarios(response.data);
    } catch (error) {
      toast.error('Failed to load scenarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scenarioId) => {
    if (!window.confirm('Are you sure you want to delete this scenario?')) return;
    
    try {
      await axios.delete(`${API}/scenarios/${scenarioId}`);
      toast.success('Scenario deleted');
      loadScenarios();
    } catch (error) {
      toast.error('Failed to delete scenario');
    }
  };

  const handleDuplicate = async (scenarioId, originalName) => {
    const newName = prompt('Enter name for duplicated scenario:', `Copy of ${originalName}`);
    if (!newName) return;
    
    try {
      await axios.post(`${API}/scenarios/${scenarioId}/duplicate?new_name=${encodeURIComponent(newName)}`);
      toast.success('Scenario duplicated');
      loadScenarios();
    } catch (error) {
      toast.error('Failed to duplicate scenario');
    }
  };

  const handleLoadScenario = (scenario) => {
    navigate('/edit-scenario', { state: { scenario } });
  };

  const handleRename = async (scenarioId, currentName) => {
    const newName = prompt('Enter new name for scenario:', currentName);
    if (!newName || newName === currentName) return;
    
    try {
      await axios.put(`${API}/scenarios/${scenarioId}`, { name: newName });
      toast.success('Scenario renamed');
      loadScenarios();
    } catch (error) {
      toast.error('Failed to rename scenario');
    }
  };

  const handleViewResults = (scenario) => {
    if (!scenario.optimization_results) {
      toast.error('This scenario has not been optimized yet');
      return;
    }
    navigate('/results', { state: { data: scenario.optimization_results, scenarioName: scenario.name } });
  };

  const toggleComparisonSelection = (scenarioId) => {
    setSelectedForComparison(prev => {
      if (prev.includes(scenarioId)) {
        return prev.filter(id => id !== scenarioId);
      } else if (prev.length < 3) {
        return [...prev, scenarioId];
      } else {
        toast.error('You can compare maximum 3 scenarios at once');
        return prev;
      }
    });
  };

  const handleCompare = () => {
    if (selectedForComparison.length < 2) {
      toast.error('Select at least 2 scenarios to compare');
      return;
    }
    navigate('/compare', { state: { scenarioIds: selectedForComparison } });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-slate-600">Loading scenarios...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }} data-testid="scenarios-title">
            SCENARIOS
          </h1>
          <p className="text-sm text-slate-600">Manage and compare your optimization scenarios</p>
        </div>
        <div className="flex gap-3">
          {selectedForComparison.length >= 2 && (
            <button
              onClick={handleCompare}
              className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
              data-testid="compare-button"
            >
              <BarChart3 className="w-4 h-4" />
              Compare ({selectedForComparison.length})
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-4 py-2 font-medium transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            data-testid="new-scenario-button"
          >
            <Plus className="w-4 h-4" />
            New Scenario
          </button>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-600 mb-4">No scenarios yet. Create your first optimization scenario!</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white hover:bg-blue-600 rounded-md px-6 py-3 font-medium transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create First Scenario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`bg-white border rounded-xl shadow-sm p-6 transition-all hover:shadow-md ${
                selectedForComparison.includes(scenario.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
              }`}
              data-testid={`scenario-card-${scenario.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{scenario.name}</h3>
                    <button
                      onClick={() => handleRename(scenario.id, scenario.name)}
                      className="text-slate-400 hover:text-slate-600"
                      title="Rename scenario"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  {scenario.description && (
                    <p className="text-sm text-slate-600 mb-2">{scenario.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(scenario.created_at)}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedForComparison.includes(scenario.id)}
                  onChange={() => toggleComparisonSelection(scenario.id)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-2 focus:ring-blue-200"
                  data-testid={`scenario-checkbox-${scenario.id}`}
                />
              </div>

              {scenario.optimization_results && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 uppercase font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Cost</p>
                      <p className="text-lg font-mono font-bold text-slate-900">
                        ₹{scenario.optimization_results.summary_metrics?.total_cost?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Trucks</p>
                      <p className="text-lg font-mono font-bold text-slate-900">
                        {scenario.optimization_results.summary_metrics?.total_trucks?.toFixed(1) || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadScenario(scenario)}
                  className="flex-1 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-3 py-2 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  data-testid={`load-scenario-${scenario.id}`}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                {scenario.optimization_results && (
                  <button
                    onClick={() => handleViewResults(scenario)}
                    className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-md px-3 py-2 text-sm font-medium transition-all flex items-center justify-center gap-2"
                    data-testid={`view-results-${scenario.id}`}
                  >
                    <Play className="w-4 h-4" />
                    View
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(scenario.id, scenario.name)}
                  className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md px-3 py-2 text-sm transition-all"
                  data-testid={`duplicate-scenario-${scenario.id}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(scenario.id)}
                  className="bg-white text-red-600 border border-slate-200 hover:bg-red-50 rounded-md px-3 py-2 text-sm transition-all"
                  data-testid={`delete-scenario-${scenario.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenariosPage;