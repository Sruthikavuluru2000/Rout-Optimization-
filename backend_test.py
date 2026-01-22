import requests
import sys
import json
import tempfile
import pandas as pd
from datetime import datetime
import os

class RouteOptimizationAPITester:
    def __init__(self, base_url="https://route-planner-app-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Response: {response.text[:100]}"
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, str(e))
            return False

    def create_sample_excel(self):
        """Create a sample Excel file for testing"""
        try:
            # Create sample data
            cities_data = {
                'city': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
                'demand': [100, 150, 120, 80, 90]
            }
            
            route_cities_data = {
                'route': ['R1', 'R1', 'R2', 'R2', 'R3'],
                'city': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata']
            }
            
            route_trucktypes_data = {
                'route': ['R1', 'R2', 'R3'],
                'truck_type': ['Small', 'Medium', 'Large'],
                'capacity': [200, 300, 400],
                'cost': [1000, 1500, 2000]
            }
            
            # Create temporary Excel file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
            
            with pd.ExcelWriter(temp_file.name, engine='openpyxl') as writer:
                pd.DataFrame(cities_data).to_excel(writer, sheet_name='Cities', index=False)
                pd.DataFrame(route_cities_data).to_excel(writer, sheet_name='Route_Cities', index=False)
                pd.DataFrame(route_trucktypes_data).to_excel(writer, sheet_name='Route_TruckTypes', index=False)
            
            self.log_test("Sample Excel Creation", True, f"Created: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            self.log_test("Sample Excel Creation", False, str(e))
            return None

    def test_excel_upload(self, excel_file):
        """Test Excel file upload and validation"""
        try:
            with open(excel_file, 'rb') as f:
                files = {'file': ('test_data.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                response = requests.post(f"{self.api_url}/upload-excel", files=files, timeout=30)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                expected_keys = ['success', 'message', 'data', 'file_data']
                has_keys = all(key in data for key in expected_keys)
                success = success and has_keys and data.get('success', False)
                details = f"Status: {response.status_code}, Cities: {data.get('data', {}).get('cities_count', 0)}, Routes: {data.get('data', {}).get('routes_count', 0)}"
                self.log_test("Excel Upload & Validation", success, details)
                return data.get('file_data') if success else None
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                self.log_test("Excel Upload & Validation", False, details)
                return None
                
        except Exception as e:
            self.log_test("Excel Upload & Validation", False, str(e))
            return None

    def test_optimization(self, file_data):
        """Test route optimization"""
        if not file_data:
            self.log_test("Route Optimization", False, "No file data provided")
            return None
            
        try:
            response = requests.post(f"{self.api_url}/optimize", json=file_data, timeout=60)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                expected_keys = ['total_cost', 'routes_selected', 'summary_metrics', 'city_coordinates']
                has_keys = all(key in data for key in expected_keys)
                success = success and has_keys
                details = f"Status: {response.status_code}, Total Cost: {data.get('total_cost', 0)}, Routes: {len(data.get('routes_selected', []))}"
                self.log_test("Route Optimization", success, details)
                return data if success else None
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                self.log_test("Route Optimization", False, details)
                return None
                
        except Exception as e:
            self.log_test("Route Optimization", False, str(e))
            return None

    def test_export_results(self, optimization_data):
        """Test results export"""
        if not optimization_data:
            self.log_test("Results Export", False, "No optimization data provided")
            return False
            
        try:
            response = requests.post(f"{self.api_url}/export-results", json=optimization_data, timeout=30)
            
            success = response.status_code == 200
            if success:
                # Check if response is Excel file
                content_type = response.headers.get('content-type', '')
                is_excel = 'spreadsheet' in content_type or 'excel' in content_type
                file_size = len(response.content)
                success = success and is_excel and file_size > 0
                details = f"Status: {response.status_code}, Content-Type: {content_type}, Size: {file_size} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Results Export", success, details)
            return success
            
        except Exception as e:
            self.log_test("Results Export", False, str(e))
            return False

    def test_invalid_file_upload(self):
        """Test upload with invalid file format"""
        try:
            # Create a text file instead of Excel
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
            temp_file.write(b"This is not an Excel file")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                response = requests.post(f"{self.api_url}/upload-excel", files=files, timeout=10)
            
            # Should return 400 for invalid file format
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.text[:100]}"
            self.log_test("Invalid File Format Rejection", success, details)
            
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Invalid File Format Rejection", False, str(e))
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Route Optimization API Tests")
        print(f"Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test 1: API Health
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test 2: Invalid file upload
        self.test_invalid_file_upload()
        
        # Test 3: Create sample Excel
        excel_file = self.create_sample_excel()
        if not excel_file:
            print("❌ Cannot create sample Excel file. Stopping tests.")
            return False
        
        try:
            # Test 4: Excel upload and validation
            file_data = self.test_excel_upload(excel_file)
            
            # Test 5: Route optimization
            optimization_data = self.test_optimization(file_data)
            
            # Test 6: Results export
            self.test_export_results(optimization_data)
            
        finally:
            # Cleanup
            if excel_file and os.path.exists(excel_file):
                os.unlink(excel_file)
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check details above.")
            return False

def main():
    tester = RouteOptimizationAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())