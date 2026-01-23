import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, X, Loader2, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MultiUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedScenarios, setUploadedScenarios] = useState([]);
  const navigate = useNavigate();

  const handleFilesSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const excelFiles = selectedFiles.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (excelFiles.length !== selectedFiles.length) {
      toast.error('Some files were skipped - only Excel files allowed');
    }
    
    setFiles(excelFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);
    const scenarios = [];

    try {
      // Upload each file and create scenario
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // Upload and parse Excel
        const uploadResponse = await axios.post(`${API}/upload-excel`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (!uploadResponse.data.success) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Optimize
        const optimizeResponse = await axios.post(`${API}/optimize`, uploadResponse.data.file_data);

        // Create scenario
        const scenarioName = file.name.replace(/\.xlsx?$/i, '');
        const scenarioData = {
          name: scenarioName,
          description: `Auto-created from ${file.name}`,
          input_data: uploadResponse.data.file_data,
          optimization_results: optimizeResponse.data
        };

        const scenarioResponse = await axios.post(`${API}/scenarios`, scenarioData);
        scenarios.push(scenarioResponse.data);

        toast.success(`✓ ${scenarioName} completed (${i + 1}/${files.length})`);
      }

      setUploadedScenarios(scenarios);
      
      if (scenarios.length >= 2) {
        // Navigate to comparison
        const scenarioIds = scenarios.map(s => s.id);
        navigate('/compare', { state: { scenarioIds } });
      } else if (scenarios.length === 1) {
        toast.success('Scenario created! View it in Scenarios page');
        navigate('/scenarios');
      }
    } catch (error) {
      toast.error('Upload process failed');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className=\"p-8\">
      <div className=\"max-w-4xl mx-auto\">
        <div className=\"mb-8 flex items-center justify-between\">
          <div>
            <h1 className=\"text-4xl font-bold tracking-tight uppercase mb-2\" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              MULTI-FILE UPLOAD
            </h1>
            <p className=\"text-sm text-slate-600\">Upload multiple Excel files and compare them instantly</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className=\"bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-all flex items-center gap-2\"
          >
            <X className=\"w-4 h-4\" />
            Cancel
          </button>
        </div>

        <div className=\"bg-white border border-slate-200 rounded-xl shadow-sm p-8 mb-6\">
          <label
            htmlFor=\"multi-file-upload\"
            className=\"border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group\"
          >
            <input
              id=\"multi-file-upload\"
              type=\"file\"
              accept=\".xlsx,.xls\"
              multiple
              onChange={handleFilesSelect}
              className=\"hidden\"
            />
            <UploadCloud className=\"w-16 h-16 text-slate-400 group-hover:text-blue-500 transition-colors mb-4\" />
            <p className=\"text-lg font-medium text-slate-900 mb-1\">Drop multiple Excel files here</p>
            <p className=\"text-sm text-slate-500\">or click to browse</p>
            <p className=\"text-xs text-slate-400 mt-2\">Upload 2-10 files for comparison</p>
          </label>

          {files.length > 0 && (
            <div className=\"mt-6\">
              <h3 className=\"text-sm font-semibold text-slate-700 mb-3\">Selected Files ({files.length})</h3>
              <div className=\"space-y-2\">
                {files.map((file, idx) => (
                  <div key={idx} className=\"flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3\">
                    <div className=\"flex items-center gap-3\">
                      <FileSpreadsheet className=\"w-5 h-5 text-green-600\" />
                      <span className=\"text-sm text-slate-900 font-medium\">{file.name}</span>
                      <span className=\"text-xs text-slate-500\">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className=\"text-red-600 hover:text-red-800\"
                      disabled={uploading}
                    >
                      <X className=\"w-4 h-4\" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUploadAll}
                disabled={uploading}
                className=\"w-full mt-6 bg-blue-500 text-white hover:bg-blue-600 rounded-md px-4 py-3 font-medium transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2\"
              >
                {uploading ? (
                  <>
                    <Loader2 className=\"w-5 h-5 animate-spin\" />
                    Processing {files.length} files...
                  </>
                ) : (
                  `Upload & Compare ${files.length} Files`
                )}
              </button>
            </div>
          )}
        </div>

        <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4\">
          <h4 className=\"text-sm font-semibold text-blue-900 mb-2\">How it works:</h4>
          <ol className=\"text-xs text-blue-800 space-y-1 list-decimal list-inside\">
            <li>Select 2 or more Excel files (each file = one scenario)</li>
            <li>Files are uploaded, validated, and optimized automatically</li>
            <li>Scenarios are created with file names</li>
            <li>You're taken to comparison page to see differences</li>
          </ol>
          <p className=\"text-xs text-blue-700 mt-3 italic\">Perfect for comparing different time periods or cost scenarios!</p>
        </div>
      </div>
    </div>
  );
};

export default MultiUploadPage;