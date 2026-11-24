#!/usr/bin/env python3
"""Serve the hunarlink repo the way GitHub Pages does, on port 8123.

Why not `python -m http.server`:
  * GitHub Pages serves 404.html for any unresolvable path *at any depth*, and
    the app relies on that for its deep-link handoff (/hunarlink/react/product
    must land on the root 404.html, which then rewrites to the SPA).
  * http.server answers 404 with an empty body, so every deep link dies.

It also binds 0.0.0.0 so the workspace preview proxy can reach it, and blocks
path traversal, which http.server does not do consistently.
"""
import http.server
import os
import socketserver
import sys

# A GitHub project site is served at /<repo>/, so the document root is the
# PARENT of the repo and every URL carries the /hunarlink/ prefix.
ROOT = "/home/user"
REPO = "hunarlink"
FALLBACK_404 = os.path.join(ROOT, REPO, "404.html")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class PagesHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def translate_path(self, path):
        # strip query/fragment, then resolve inside ROOT
        path = path.split("?", 1)[0].split("#", 1)[0]
        full = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not full.startswith(ROOT):
            return os.path.join(ROOT, "__nope__")
        return full

    def send_head(self):
        # the preview proxy hands us "/" — that is the project root, not a page
        if self.path.split("?")[0] in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/%s/" % REPO)
            self.end_headers()
            return None
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.exists(index):
                return self._send_file(index)
        if os.path.exists(path) and not os.path.isdir(path):
            return self._send_file(path)
        # GitHub Pages behaviour: unresolved path -> root 404.html, status 404
        return self._send_file(FALLBACK_404, status=404)

    def _send_file(self, fs_path, status=None):
        try:
            f = open(fs_path, "rb")
        except OSError:
            self.send_error(404, "Not Found")
            return None
        try:
            st = os.fstat(f.fileno())
        except OSError:
            f.close()
            self.send_error(404, "Not Found")
            return None
        self.send_response(status or 200)
        self.send_header("Content-Type", self.guess_type(fs_path))
        self.send_header("Content-Length", str(st.st_size))
        self.send_header("Last-Modified", self.date_time_string(st.st_mtime))
        # never let a stale build hide a fix
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()
        return f

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), PagesHandler) as httpd:
        print("hunarlink pages server on http://0.0.0.0:%d" % PORT, flush=True)
        httpd.serve_forever()
