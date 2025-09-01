#!/usr/bin/env python3
"""
Simple static file server for ACT Placemat development
Bypasses all Node.js/Vite port conflicts and serves built files
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def find_build_dir():
    """Find the build/dist directory"""
    possible_paths = [
        'apps/frontend/dist',
        'apps/frontend/build', 
        'dist',
        'build',
        'frontend/dist',
        'frontend/build'
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

def serve_static_files(port=8080):
    build_dir = find_build_dir()
    
    if not build_dir:
        print("❌ No build directory found. Please run 'npm run build' first.")
        print("Looking for: apps/frontend/dist, apps/frontend/build, dist, build")
        return False
    
    print(f"📁 Serving from: {os.path.abspath(build_dir)}")
    
    # Change to build directory
    original_cwd = os.getcwd()
    os.chdir(build_dir)
    
    try:
        with socketserver.TCPServer(("", port), CORSRequestHandler) as httpd:
            print(f"🚀 Static server running at http://localhost:{port}")
            print(f"📊 Daily Habits Tracker: http://localhost:{port}/daily-habits")
            print(f"🏠 Real Dashboard: http://localhost:{port}/real-dashboard")
            print(f"📈 Real Analytics: http://localhost:{port}/real-analytics")
            print("\n🔧 This bypasses all Node.js/Vite port conflicts!")
            print("Press Ctrl+C to stop the server")
            
            # Open browser
            webbrowser.open(f'http://localhost:{port}')
            
            httpd.serve_forever()
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False
    finally:
        os.chdir(original_cwd)
    
    return True

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number, using default 8080")
    
    serve_static_files(port)