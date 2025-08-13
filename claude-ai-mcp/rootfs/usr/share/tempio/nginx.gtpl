server {
    listen {{ .port }} default_server;

    include /etc/nginx/includes/server_params.conf;
    include /etc/nginx/includes/proxy_params.conf;

    location {{ .entry }} {
        allow   172.30.32.2;
        deny    all;

        proxy_pass http://127.0.0.1:8099;
        proxy_set_header X-Ingress-Path {{ .entry }};
    }

    location {{ .entry }}/.well-known/mcp.json {
        allow   all;
        proxy_pass http://127.0.0.1:8099/.well-known/mcp.json;
        proxy_set_header X-Ingress-Path {{ .entry }};
    }

    location {{ .entry }}/mcp/sse {
        allow   172.30.32.2;
        deny    all;

        proxy_pass http://127.0.0.1:8099/mcp/sse;
        proxy_set_header X-Ingress-Path {{ .entry }};
        
        # SSE specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400;
    }

    location {{ .entry }}/health {
        allow   172.30.32.2;
        deny    all;
        proxy_pass http://127.0.0.1:8099/health;
    }

    location {{ .entry }}/metrics {
        allow   172.30.32.2;
        deny    all;
        proxy_pass http://127.0.0.1:8099/metrics;
    }
}