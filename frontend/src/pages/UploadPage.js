import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download, Save } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UploadPage = ({ onDataUploaded, onOptimizationComplete, fileData, loadedScenario, onScenarioSaved }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [lastOptimizationResult, setLastOptimizationResult] = useState(null);
  const navigate = useNavigate();

  // Remove the useEffect that was causing issues
  // useEffect(() => {
  //   if (fileData) {
  //     setValidationResult(fileData);
  //   }
  // }, [fileData]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setValidationResult(null);
      } else {
        toast.error('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        console.log('Full Upload response:', JSON.stringify(response.data, null, 2));
        const result = response.data;
        
        // Ensure the structure is correct
        if (!result.data) {
          console.error('Missing data property in response');
          toast.error('Invalid response from server');
          return;
        }
        
        console.log('Cities count from response:', result.data.cities_count);
        console.log('Routes count from response:', result.data.routes_count);
        console.log('Truck types from response:', result.data.truck_types);
        
        setValidationResult(result);
        onDataUploaded(result.file_data);
        toast.success('File uploaded and validated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleOptimize = async () => {
    if (!validationResult || !validationResult.file_data) return;

    setOptimizing(true);

    try {
      const response = await axios.post(`${API}/optimize`, validationResult.file_data);
      setLastOptimizationResult(response.data);
      onOptimizationComplete(response.data);
      toast.success('Optimization completed successfully!');
      
      // Show save modal
      setShowSaveModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Optimization failed');
      console.error('Optimization error:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }

    try {
      const scenarioData = {
        name: scenarioName,
        description: scenarioDescription,
        input_data: validationResult.file_data,
        optimization_results: lastOptimizationResult
      };

      if (loadedScenario) {
        // Update existing scenario
        await axios.put(`${API}/scenarios/${loadedScenario.id}`, scenarioData);
        toast.success('Scenario updated successfully!');
      } else {
        // Create new scenario
        await axios.post(`${API}/scenarios`, scenarioData);
        toast.success('Scenario saved successfully!');
      }

      setShowSaveModal(false);
      setScenarioName('');
      setScenarioDescription('');
      if (onScenarioSaved) onScenarioSaved();
      navigate('/results');
    } catch (error) {
      toast.error('Failed to save scenario');
      console.error(error);
    }
  };

  const handleSkipSave = () => {
    setShowSaveModal(false);
    navigate('/results');
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/route_optimization_template.xlsx';
    link.download = 'route_optimization_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded successfully!');
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }} data-testid="page-title">
              ROUTE OPTIMIZATION
            </h1>
            <p className="text-sm text-slate-600">Upload your Excel file to begin optimization</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/multi-upload')}
              className="bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Multi-File Upload
            </button>
            <button
              onClick={() => navigate('/edit-scenario')}
              className="bg-white text-green-600 border border-green-300 hover:bg-green-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Create in App
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2"
              data-testid="download-template-button"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 mb-6" data-testid="upload-card">
          <label
            htmlFor="file-upload"
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group"
            data-testid="file-upload-area"
          >
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
            
            {file ? (
              <>
                <FileSpreadsheet className="w-16 h-16 text-blue-500 mb-4" />
                <p className="text-lg font-medium text-slate-900 mb-1">{file.name}</p>
                <p className="text-sm text-slate-500">Click to change file</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-16 h-16 text-slate-400 group-hover:text-blue-500 transition-colors mb-4" />
                <p className="text-lg font-medium text-slate-900 mb-1">Drop your Excel file here</p>
                <p className="text-sm text-slate-500">or click to browse</p>
                <p className="text-xs text-slate-400 mt-2">Supported formats: .xlsx, .xls</p>
              </>
            )}
          </label>

          {file && !validationResult && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 rounded-md px-4 py-3 font-medium transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="upload-button"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload & Validate'
              )}
            </button>
          )}
        </div>

        {validationResult && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6" data-testid="validation-result">
            <div className="flex items-start gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">File Validated Successfully</h3>
                <p className="text-sm text-slate-600">Your Excel file has been processed and is ready for optimization</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Cities</p>
                <p className="text-2xl font-mono font-bold text-slate-900" data-testid="cities-count">{validationResult.data?.cities_count || 0}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Routes</p>
                <p className="text-2xl font-mono font-bold text-slate-900" data-testid="routes-count">{validationResult.data?.routes_count || 0}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Truck Types</p>
                <p className="text-2xl font-mono font-bold text-slate-900" data-testid="truck-types-count">{validationResult.data?.truck_types?.length || 0}</p>
              </div>
            </div>

            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="w-full bg-blue-500 text-white hover:bg-blue-600 rounded-md px-4 py-3 font-medium transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="optimize-button"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimizing Routes...
                </>
              ) : (
                'Run Optimization'
              )}
            </button>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Excel File Format</h4>
              <p className="text-xs text-blue-800 mb-2">Your Excel file should contain these sheets:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Cities:</strong> columns - city, demand, lat (optional), long (optional)</li>
                <li><strong>Route_Cities:</strong> columns - route, city</li>
                <li><strong>Route_TruckTypes:</strong> columns - route, truck_type, capacity, cost</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2 italic">Note: If lat/long are not provided, cities will be auto-geocoded.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="save-scenario-modal">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <Save className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-semibold">Save Scenario</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Q1 2025 Routes"
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="scenario-name-input"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Add notes about this scenario..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="scenario-description-input"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSkipSave}
                className="flex-1 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all"
                data-testid="skip-save-button"
              >
                Skip
              </button>
              <button
                onClick={handleSaveScenario}
                className="flex-1 bg-blue-500 text-white hover:bg-blue-600 rounded-md px-4 py-2 font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                data-testid="save-scenario-button"
              >
                <Save className="w-4 h-4" />
                {loadedScenario ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;