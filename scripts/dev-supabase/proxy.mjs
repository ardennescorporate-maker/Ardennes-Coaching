// Exposes GoTrue and PostgREST under one origin, like Supabase's API gateway.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const routes = { "/auth/v1": 9999, "/rest/v1": 3001 };
const templates = path.resolve(import.meta.dirname, "../../supabase/templates");

http
  .createServer((req, res) => {
    if (req.url.startsWith("/templates/")) {
      const file = path.join(templates, path.basename(req.url));
      if (!fs.existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": "text/html" });
      return fs.createReadStream(file).pipe(res);
    }
    const prefix = Object.keys(routes).find((p) => req.url.startsWith(p));
    if (!prefix) return res.writeHead(404).end("not found");
    const cors = {
      "access-control-allow-origin": req.headers.origin || "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-expose-headers": "content-range, x-total-count",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port: routes[prefix],
        path: req.url.slice(prefix.length) || "/",
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${routes[prefix]}` },
      },
      (up) => {
        res.writeHead(up.statusCode, { ...up.headers, ...cors });
        up.pipe(res);
      },
    );
    upstream.on("error", (e) => res.writeHead(502).end(String(e)));
    req.pipe(upstream);
  })
  .listen(54321, () => console.log("dev supabase proxy on :54321"));
