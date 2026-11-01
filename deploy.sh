#!/usr/bin/env bash
# scoreref-livetracker 部署/启动脚本（nginx 静态镜像）。
#
#   ./deploy.sh                 # 拉取 latest 镜像并启动（默认）
#   ./deploy.sh --tag v0.1.0    # 指定镜像 tag
#   ./deploy.sh --port 8088     # 指定宿主机端口
#   ./deploy.sh --ws http://host.docker.internal:7070
#   ./deploy.sh build           # 用当前源码构建镜像再启动
#   ./deploy.sh logs|status|down
#
# 也可用环境变量：DOCKER_REGISTRY / IMAGE_TAG / APP_PORT / WS_UPSTREAM。
set -euo pipefail

cd "$(dirname "$0")"

DOCKER_REGISTRY="${DOCKER_REGISTRY:-172.25.0.1:8082}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
APP_PORT="${APP_PORT:-8088}"
WS_UPSTREAM="${WS_UPSTREAM:-http://103.171.35.90:7070}"
SERVICE=web

usage() {
	cat <<EOF
用法: ./deploy.sh [up|build|logs|status|down] [选项]

  up       拉取镜像并启动（默认）
  build    用当前源码构建镜像并启动（wasabi 等 VITE_* 从 .env 读取）
  logs     跟踪容器日志
  status   查看容器状态
  down     停止并删除容器

选项:
  --tag TAG    镜像 tag（默认 ${IMAGE_TAG}）
  --port PORT  宿主机端口（默认 ${APP_PORT}）
  --ws URL     WebSocket 后端（默认 ${WS_UPSTREAM}）
  --no-pull    启动前不拉镜像
  -h, --help   显示帮助
EOF
}

ACTION=up
NO_PULL=0
while [[ $# -gt 0 ]]; do
	case "$1" in
		up|build|logs|status|down) ACTION="$1"; shift ;;
		--tag) IMAGE_TAG="$2"; shift 2 ;;
		--port) APP_PORT="$2"; shift 2 ;;
		--ws) WS_UPSTREAM="$2"; shift 2 ;;
		--no-pull) NO_PULL=1; shift ;;
		-h|--help) usage; exit 0 ;;
		*) echo "未知参数: $1" >&2; usage >&2; exit 1 ;;
	esac
done

export DOCKER_REGISTRY IMAGE_TAG APP_PORT WS_UPSTREAM

if docker compose version >/dev/null 2>&1; then
	COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
	COMPOSE=(docker-compose)
else
	echo "未找到 docker compose，请先安装 Docker Compose" >&2
	exit 1
fi

IMAGE="${DOCKER_REGISTRY}/hypersports/scoreref-livetracker:${IMAGE_TAG}"

case "$ACTION" in
	logs)
		exec "${COMPOSE[@]}" logs -f --tail=200 "$SERVICE"
		;;
	status)
		"${COMPOSE[@]}" ps "$SERVICE"
		exit 0
		;;
	down)
		"${COMPOSE[@]}" down --remove-orphans
		exit 0
		;;
	up)
		if [[ "$NO_PULL" != 1 ]]; then
			echo "==> 拉取镜像 ${IMAGE}"
			if ! "${COMPOSE[@]}" pull "$SERVICE"; then
				echo "拉取失败：确认已 docker login ${DOCKER_REGISTRY}，" >&2
				echo "或先用当前源码构建：./deploy.sh build" >&2
				exit 1
			fi
		fi
		echo "==> 启动容器"
		"${COMPOSE[@]}" up -d --remove-orphans "$SERVICE"
		;;
	build)
		echo "==> 用当前源码构建 ${IMAGE}"
		if [[ ! -f .env ]]; then
			echo "提示: 没有 .env，镜像将不带 Wasabi 配置（队徽等图片不可用）" >&2
		fi
		"${COMPOSE[@]}" build "$SERVICE"
		"${COMPOSE[@]}" up -d --remove-orphans "$SERVICE"
		;;
esac

# 等容器里的 /healthz 返回 200（最多 30s）
cid="$("${COMPOSE[@]}" ps -q "$SERVICE")"
if [[ -z "$cid" ]]; then
	echo "容器没有启动，查看日志：" >&2
	"${COMPOSE[@]}" logs --tail=100 "$SERVICE" >&2 || true
	exit 1
fi

printf '==> 等待健康检查'
healthy=0
i=0
while [[ "$i" -lt 30 ]]; do
	i=$((i + 1))
	state="$(docker inspect --format '{{.State.Status}}' "$cid" 2>/dev/null || echo missing)"
	if [[ "$state" == "exited" || "$state" == "dead" || "$state" == "missing" ]]; then
		echo
		echo "容器状态异常: ${state}" >&2
		"${COMPOSE[@]}" logs --tail=100 "$SERVICE" >&2 || true
		exit 1
	fi
	if docker exec "$cid" wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1; then
		healthy=1
		break
	fi
	printf '.'
	sleep 1
done
echo
if [[ "$healthy" != 1 ]]; then
	echo "健康检查超时，查看日志：./deploy.sh logs" >&2
	exit 1
fi

echo "==> 启动完成"
echo "    镜像:   ${IMAGE}"
echo "    地址:   http://<本机IP>:${APP_PORT}"
echo "    健康:   http://<本机IP>:${APP_PORT}/healthz"
echo "    WS:     ${WS_UPSTREAM}/ws"
"${COMPOSE[@]}" ps "$SERVICE"
