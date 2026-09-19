#!/usr/bin/env python3
"""A static server for developing and filming: like http.server, but every
response says Cache-Control: no-store, so an edited module is what the
browser runs. Chrome otherwise keeps a heuristically cached world.js for
hours, and an eval can silently measure last hour's prompt.

    python3 tools/serve.py 8765
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ThreadingHTTPServer(("", port), H).serve_forever()
