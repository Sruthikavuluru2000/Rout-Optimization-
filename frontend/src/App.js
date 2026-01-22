import { useState } from "react";
import "@/App.css";
import "leaflet/dist/leaflet.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";

function App() {
  const [optimizationData, setOptimizationData] = useState(null);
  const [fileData, setFileData] = useState(null);

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
                  }}
                />
              } 
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;