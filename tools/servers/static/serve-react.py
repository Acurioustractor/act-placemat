#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import urlparse

class ReactHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # If it's a file request (has extension), serve normally
        if '.' in os.path.basename(path):
            return super().do_GET()
        
        # For all other routes, serve index.html (React Router will handle it)
        self.path = '/index.html'
        return super().do_GET()

if __name__ == "__main__":
    PORT = 5173
    os.chdir('apps/frontend/dist')
    
    with socketserver.TCPServer(("", PORT), ReactHandler) as httpd:
        print(f"🚀 React app serving at http://localhost:{PORT}")
        httpd.serve_forever()