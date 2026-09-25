"""Envio opcional do resultado diário para a aba Monitoramento Links."""
import json
import os
import re
from urllib.request import Request, urlopen

def enviar_dashboard(now, rows):
    endpoint = os.getenv("DASHBOARD_WEBHOOK_URL", "").strip()
    token = os.getenv("DASHBOARD_INGEST_TOKEN", "").strip()
    if not endpoint or not token:
        print("Dashboard: configure DASHBOARD_WEBHOOK_URL e DASHBOARD_INGEST_TOKEN para ativar.")
        return
    if not endpoint.startswith("https://script.google.com/"):
        print("AVISO: endpoint do dashboard inválido.")
        return
    prepared = []
    for row in rows:
        detail = row["detail"]
        http = re.search(r"HTTP (\d{3})", detail)
        destination = re.search(r"destino: (\S+)", detail)
        prepared.append({
            "id": row["id"], "title": row["title"],
            "status": "Erro" if row["status"] == "Quebrado" else row["status"],
            "http": http.group(1) if http else "",
            "destination": destination.group(1) if destination else "",
            "detail": detail,
        })
    payload = json.dumps({"token": token, "checked_at": now.isoformat(), "rows": prepared}).encode("utf-8")
    try:
        req = Request(endpoint, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not result.get("ok") or result.get("received") != len(prepared):
            raise RuntimeError("O Apps Script não confirmou a gravação.")
        print(f"Dashboard atualizado: {len(prepared)} produtos.")
    except Exception as exc:
        print(f"AVISO: falha ao atualizar dashboard ({type(exc).__name__}: {exc}). E-mail continuará normalmente.")
