#!/usr/bin/env python3
"""
Wind Turbine Damage Detection System
Startup script for both backend and frontend
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def check_requirements():
    """Check if all requirements are installed"""
    try:
        import ultralytics
        import fastapi
        import uvicorn
        print("✓ All Python requirements are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing requirement: {e}")
        print("Please install requirements: pip install -r backend/requirements.txt")
        return False

def start_backend():
    """Start the FastAPI backend server"""
    print("Starting backend server...")
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("✗ Backend directory not found!")
        return None
    
    # Start server from backend directory but keep current working directory
    original_cwd = os.getcwd()
    process = subprocess.Popen([
        sys.executable, "-m", "uvicorn", 
        "app:app", 
        "--host", "0.0.0.0", 
        "--port", "8000",
        "--reload"
    ], cwd=str(backend_dir))
    
    # Change back to original directory
    os.chdir(original_cwd)
    
    # Wait a moment for server to start
    time.sleep(3)
    return process

def start_frontend():
    """Start the frontend (open in browser)"""
    print("Opening frontend...")
    frontend_path = Path("frontend/index.html").absolute()
    
    if not frontend_path.exists():
        print("✗ Frontend files not found!")
        print(f"Looking for: {frontend_path}")
        print("Current directory:", os.getcwd())
        print("Available files:", list(Path(".").iterdir()))
        return False
    
    # Open in default browser
    webbrowser.open(f"file://{frontend_path}")
    return True

def main():
    print("=" * 60)
    print("Wind Turbine Damage Detection System")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("runs/detect/nordtank_damage4/weights/best.pt").exists():
        print("✗ Model file not found!")
        print("Please make sure you're in the correct directory with your trained model")
        return
    
    # Check requirements
    if not check_requirements():
        return
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        return
    
    # Start frontend
    if not start_frontend():
        return
    
    print("\n" + "=" * 60)
    print("System is running!")
    print("=" * 60)
    print("Backend API: http://localhost:8000")
    print("Frontend: Check your browser")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        # Keep the script running
        backend_process.wait()
    except KeyboardInterrupt:
        print("\nStopping server...")
        backend_process.terminate()
        print("Server stopped")

if __name__ == "__main__":
    main()
