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

## 5. Build & push images to Docker Hub

The images carry **no secrets** — credentials are injected at runtime — so they
are safe to push to a public registry.

```powershell
docker login
docker build -t <dockerhub-user>/croplab-backend:latest ./Backend
docker build -t <dockerhub-user>/croplab-frontend:latest ./Frontend
docker push <dockerhub-user>/croplab-backend:latest
docker push <dockerhub-user>/croplab-frontend:latest
```

### Running the pulled backend image

The backend reads every credential from environment variables. Pass them with
`--env-file` (full list + template: `Backend/.env.example`):

```powershell
docker run -p 8000:8000 --env-file ./Backend/.env <dockerhub-user>/croplab-backend:latest
```

Required: `GEE_*` (Google Earth Engine), `NVIDIA_API_KEY`, `GOVDATA_API_KEY`,
`NEWSAPI_KEY`. For GEE to work via `--env-file`, the `GEE_*` vars must be in the
`.env` file — your `Backend/.env` currently has only the API keys, so copy the
`GEE_*` block from `.env.example` and fill it from the service-account JSON.

How each run mode gets credentials (none are in the image):

| Run mode | Credential source |
|---|---|
| `docker-compose` | `env_file: Backend/.env` + the GEE JSON volume mount |
| ECS / MiniStack | `deploy-ministack.ps1` injects them into the task definition |
| `docker run` | `--env-file ./Backend/.env` |

> The **frontend** image bakes the `VITE_*` map keys into its JavaScript at build
> time — unavoidable for any browser app. Restrict those keys by domain in the
> MapTiler / Mapbox dashboards.

---

## 6. Stop & clean up

### Stop everything when you're done
The app runs as ECS task containers (`ministack-ecs-*`) **plus** the MiniStack
container. Stop the tasks first, then MiniStack — otherwise the task containers
are orphaned and keep holding ports 8000 / 5173:
```powershell
docker ps -q --filter "name=ministack-ecs" | ForEach-Object { docker stop $_ }
docker-compose --profile ecs down
```
Start again later: re-run `deploy-ministack.ps1`.

### Remove leftovers
```powershell
docker container prune -f     # delete all stopped containers
docker image prune -f         # delete dangling (untagged) images
```

### What you should NOT have running
- Exactly **one** MiniStack container (`croplab-final-ministack-1`). A second,
  stray `ministackorg/ministack` container (random name like `happy_mendele`)
  is a leftover — remove it: `docker rm <name>`.
- Old `ministack-ecs-*` containers from past deploys pile up — `docker container prune -f` clears them.

### Full reset (nuclear — stops every container on your machine)
```powershell
docker stop $(docker ps -q)   # stop all running containers
docker container prune -f     # remove all stopped containers
```
