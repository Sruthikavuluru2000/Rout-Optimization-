import { useState } from "react";
import "@/App.css";
import "leaflet/dist/leaflet.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import ScenariosPage from "./pages/ScenariosPage";
import ComparePage from "./pages/ComparePage";
import EditScenarioPage from "./pages/EditScenarioPage";
import MultiUploadPage from "./pages/MultiUploadPage";

function App() {
  const [optimizationData, setOptimizationData] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [loadedScenario, setLoadedScenario] = useState(null);

  const handleLoadScenario = (scenario) => {
    setLoadedScenario(scenario);
    setFileData(scenario.input_data);
    if (scenario.optimization_results) {
      setOptimizationData(scenario.optimization_results);
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route 
              path="/" 
              element={
                <UploadPage 
                  onDataUploaded={setFileData}
                  onOptimizationComplete={(data) => {
                    setOptimizationData(data);
                  }}
                  fileData={fileData}
                  loadedScenario={loadedScenario}
                  onScenarioSaved={() => setLoadedScenario(null)}
                />
              } 
            />
            <Route 
              path="/results" 
              element={
                <ResultsPage 
                  data={optimizationData}
                  onReset={() => {
                    setOptimizationData(null);
                    setFileData(null);
                    setLoadedScenario(null);
                  }}
                />
              } 
            />
            <Route 
              path="/scenarios" 
              element={
                <ScenariosPage 
                  onLoadScenario={handleLoadScenario}
                />
              } 
            />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/edit-scenario" element={<EditScenarioPage />} />
            <Route path="/multi-upload" element={<MultiUploadPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;