# CropLab — Run & Deploy

Backend = Python/FastAPI API (port **8000**). Frontend = React app (port **5173**).

## Prerequisites
- Docker Desktop (must be **running** before any command below)
- AWS CLI — only for the MiniStack/ECS path: `pip install awscli`

---

## 1. Run with Docker Compose (everyday dev)

```powershell
docker-compose up                 # backend + frontend (frontend = Vite dev, hot-reload)
docker-compose up -d              # same, in background
docker-compose down               # stop & remove containers
docker-compose up --build         # rebuild images first (after dependency changes)
```

- Frontend → http://localhost:5173  ·  Backend → http://localhost:8000/docs
- `docker-compose.override.yml` auto-applies → frontend runs as a **dev server**; edits to `Frontend/src` hot-reload, no rebuild.
- Code edits show instantly. Hard-refresh the browser (**Ctrl+Shift+R**) if you see stale JS.

### Production-style run (static build via nginx, no hot-reload)
```powershell
docker-compose -f docker-compose.yml up --build
```

### Run only one service
```powershell
docker-compose up backend         # backend alone
```

---

## 2. Deploy to MiniStack as ECS (AWS practice)

One-time setup:
```powershell
aws configure                     # keys: test / test ; region: us-east-1 ; output: json
aws configure set cli_pager ""    # stop output from pausing
```

Deploy (also the command to re-run after any code change):
```powershell
powershell -ExecutionPolicy Bypass -File ./deploy-ministack.ps1
```

The script does everything: starts MiniStack → builds both images → creates ECS cluster
`croplab` → registers task defs (`ecs/*.task.json`) → stops old tasks → runs fresh ones.
It is idempotent — safe to run repeatedly. Only requirement: **Docker Desktop running**.
Result: Frontend → http://localhost:5173 · Backend → http://localhost:8000/docs

### Inspect / manage ECS
```powershell
$E = "http://localhost:4566"
aws --endpoint-url=$E ecs list-tasks --cluster croplab
aws --endpoint-url=$E ecs describe-tasks --cluster croplab --tasks <taskArn>
aws --endpoint-url=$E ecs stop-task --cluster croplab --task <taskArn>
```

### Redeploy cleanly
ECS `run-task` is not idempotent — stop old tasks first, or they collide on ports 8000/5173:
```powershell
aws --endpoint-url=http://localhost:4566 ecs list-tasks --cluster croplab   # get ARNs
aws --endpoint-url=http://localhost:4566 ecs stop-task --cluster croplab --task <taskArn>
powershell -ExecutionPolicy Bypass -File ./deploy-ministack.ps1
```

---

## 3. Inspect anything

```powershell
docker ps                         # running containers (+ their ports)
docker ps -a                      # include stopped ones
docker logs <name> --tail 50      # last 50 log lines
docker logs <name> -f             # follow logs live
docker exec -it <name> sh         # shell inside a container
docker images                     # built images
docker compose logs -f backend    # compose service logs
```

---

## 4. Troubleshooting

| Problem | Fix |
|---|---|
| `cannot find the file specified` / docker pipe error | Docker Desktop isn't running — start it. |
| `aws : not recognized` | `pip install awscli`, then open a **new** terminal. |
| Output stuck at `-- More --` | Press `q`. Permanent: `aws configure set cli_pager ""`. |
| `Could not connect to ...:4566` | MiniStack is down — `docker-compose --profile ecs up -d ministack`. |
| Port already allocated (8000/5173) | A task/container still holds it — stop it (see Redeploy above). |
| Code change not showing | Static/prod image is cached — rebuild, or use dev mode (`docker-compose up`). Hard-refresh browser. |
| Backend: `No Google Earth Engine credentials` | Expected unless creds are provided. Compose run mounts `Backend/earth-engine-service-account.json`; the ECS task does not (satellite features off). |
| `npm ci` fails on build | Handled — Dockerfile uses `npm ci --ignore-scripts`. |

---

## Full reset
```powershell
docker-compose --profile ecs down          # stop everything from compose
docker stop $(docker ps -q); docker rm $(docker ps -aq)   # nuke all containers
```
