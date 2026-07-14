"""Configuration gunicorn — API HoopCI derrière nginx (voir deploy/hoopci-gunicorn.service)."""
bind = '127.0.0.1:8000'
# Règle (2 × vCPU) + 1 — ajuster selon le VPS
workers = 3
timeout = 60
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 100
# Logs vers stdout/stderr → capturés par journald via systemd
accesslog = '-'
errorlog = '-'
