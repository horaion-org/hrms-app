#!/bin/sh
# pnpm test:e2e:fullstack [playwright arguments...]
#
# Runs the full-stack Playwright suite in e2e-fullstack/ against the real app, the real API and a real
# Postgres, with only Cognito replaced by the API's test-side fake (see e2e-fullstack/README.md):
#
#   1. a throwaway Postgres container (loopback only, in-memory storage, the API's db-init role script)
#   2. the API's e2e launcher: ./mvnw spring-boot:test-run in $API_DIR (Flyway migrates on start)
#   3. a production build of the app, served by `vite preview`, pointed at that API
#   4. Playwright, with any arguments given to this script
#
# Everything it started is stopped and the container removed on every exit, including failures and
# Ctrl-C. Logs stay in test-results/fullstack-stack/.
set -eu

APP_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd -P)
API_DIR=${API_DIR:-../api}
case $API_DIR in
	/*) ;;
	*) API_DIR=$APP_DIR/$API_DIR ;;
esac

E2E_DB_PORT=${E2E_DB_PORT:-55432}
E2E_API_PORT=${E2E_API_PORT:-18080}
E2E_APP_PORT=${E2E_APP_PORT:-15173}
POSTGRES_IMAGE=${E2E_POSTGRES_IMAGE:-postgres:17-alpine}
STARTUP_TIMEOUT=${E2E_STARTUP_TIMEOUT:-300}

DB_NAME=horaion_e2e
DB_OWNER=postgres
DB_APP_ROLE=horaion_app
CONTAINER_LABEL=horaion.e2e=fullstack
CONTAINER=horaion-e2e-postgres-$(date +%Y%m%d%H%M%S)-$$
E2E_LAUNCHER=com.horaion.e2e.E2eApplication
E2E_LAUNCHER_SOURCE=src/test/java/com/horaion/e2e/E2eApplication.java

# The browser reaches the app and the API on the same site (localhost), which the SameSite=Strict
# Session cookie needs; the script's own probes use IPv4 loopback, where both servers listen.
APP_ORIGIN=http://localhost:$E2E_APP_PORT
API_ORIGIN=http://localhost:$E2E_API_PORT

STACK_DIR=$APP_DIR/test-results/fullstack-stack
API_LOG=$STACK_DIR/api.log
APP_LOG=$STACK_DIR/app.log
API_ENV_FILE=$STACK_DIR/api.env

API_PID=
APP_PID=
CONTAINER_STARTED=

say() {
	printf 'e2e-fullstack: %s\n' "$*"
}

die() {
	printf 'e2e-fullstack: %s\n' "$*" >&2
	exit 1
}

# ----- preconditions -----------------------------------------------------------------------------

command -v docker >/dev/null 2>&1 ||
	die "Docker is required (the suite runs its own Postgres container) but 'docker' is not on PATH."
docker info >/dev/null 2>&1 ||
	die "Docker is installed but its daemon is not reachable. Start Docker (or check this user may use it) and retry."
for tool in curl node; do
	command -v "$tool" >/dev/null 2>&1 || die "'$tool' is required but not on PATH."
done
[ -x "$APP_DIR/node_modules/.bin/playwright" ] ||
	die "The app's dependencies are missing. Run 'pnpm install' in $APP_DIR first."
[ -d "$API_DIR" ] ||
	die "No API checkout at $API_DIR. Set API_DIR to the api repository (default ../api, relative to the app); in a git worktree layout, point it at the api worktree, e.g. API_DIR=../e2e-api."
API_DIR=$(CDPATH='' cd -- "$API_DIR" && pwd -P)
[ -x "$API_DIR/mvnw" ] || die "$API_DIR does not look like the api repository (no executable mvnw)."
[ -f "$API_DIR/$E2E_LAUNCHER_SOURCE" ] ||
	die "$API_DIR has no e2e launcher ($E2E_LAUNCHER_SOURCE). Check out an api branch that has it, or set API_DIR."
[ -f "$API_DIR/scripts/db-init/01-app-role.sh" ] ||
	die "$API_DIR has no scripts/db-init/01-app-role.sh, which creates the database's runtime role."

port_is_free() {
	node -e '
		const server = require("node:net").createServer();
		server.once("error", () => process.exit(1));
		server.listen(Number(process.argv[1]), "127.0.0.1", () => server.close(() => process.exit(0)));
	' "$1"
}

for setting in "E2E_DB_PORT=$E2E_DB_PORT" "E2E_API_PORT=$E2E_API_PORT" "E2E_APP_PORT=$E2E_APP_PORT"; do
	port_is_free "${setting#*=}" ||
		die "Port ${setting#*=} is in use (or cannot be bound). Set ${setting%%=*} to a free port and retry."
done

leftovers=$(docker ps -aq --filter "label=$CONTAINER_LABEL")
if [ -n "$leftovers" ]; then
	say "note: containers from an earlier, interrupted run still exist; remove them with:"
	say "  docker rm -f -v \$(docker ps -aq --filter label=$CONTAINER_LABEL)"
fi

# ----- teardown, on every exit -------------------------------------------------------------------

# The process and every descendant of it: the API runs as mvnw -> Maven -> a forked JVM.
process_tree() {
	ps -A -o pid= -o ppid= | awk -v root="$1" '
		{ parent[$1] = $2 }
		END {
			tree[root] = 1
			grew = 1
			while (grew) {
				grew = 0
				for (pid in parent) {
					if (!(pid in tree) && (parent[pid] in tree)) {
						tree[pid] = 1
						grew = 1
					}
				}
			}
			for (pid in tree) {
				if (pid in parent) print pid
			}
		}'
}

stop_tree() {
	[ -n "$1" ] || return 0
	pids=$(process_tree "$1")
	[ -n "$pids" ] || return 0
	say "stopping $2"
	# shellcheck disable=SC2086 # one argument per pid
	kill -TERM $pids 2>/dev/null || true
	waited=0
	while [ "$waited" -lt 30 ]; do
		alive=
		for pid in $pids; do
			if kill -0 "$pid" 2>/dev/null; then alive="$alive $pid"; fi
		done
		[ -n "$alive" ] || return 0
		sleep 1
		waited=$((waited + 1))
	done
	# shellcheck disable=SC2086
	kill -KILL $alive 2>/dev/null || true
}

cleanup() {
	status=$?
	trap - EXIT INT TERM HUP
	set +e
	stop_tree "$APP_PID" "the app server"
	stop_tree "$API_PID" "the API"
	if [ -n "$CONTAINER_STARTED" ] && [ -n "$(docker ps -aq --filter "name=^$CONTAINER\$")" ]; then
		say "removing $CONTAINER"
		docker rm -f -v "$CONTAINER" >/dev/null 2>&1 ||
			say "could not remove $CONTAINER; remove it with: docker rm -f -v $CONTAINER"
	fi
	rm -f "$API_ENV_FILE"
	[ "$status" -eq 0 ] || say "logs: $STACK_DIR"
	exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

mkdir -p "$STACK_DIR"
rm -rf "$STACK_DIR/api-workdir" "$STACK_DIR/dist"
mkdir -p "$STACK_DIR/api-workdir"

# Throwaway credentials for a throwaway, loopback-only database.
random_secret() {
	od -An -N18 -tx1 /dev/urandom | tr -d ' \n'
}
DB_OWNER_PASSWORD=$(random_secret)
DB_APP_PASSWORD=$(random_secret)

# Waits until "$@" succeeds; gives up after STARTUP_TIMEOUT seconds or when the check_alive function
# reports that what we are waiting for has died.
wait_until() {
	what=$1
	shift
	waited=0
	until "$@" >/dev/null 2>&1; do
		check_alive
		[ "$waited" -lt "$STARTUP_TIMEOUT" ] ||
			die "$what did not come up within ${STARTUP_TIMEOUT}s (E2E_STARTUP_TIMEOUT). Logs: $STACK_DIR"
		sleep 1
		waited=$((waited + 1))
	done
}

show_log_tail() {
	say "last lines of $1:"
	tail -n 40 "$1" >&2 || true
}

# ----- 1. Postgres -------------------------------------------------------------------------------

say "starting Postgres ($POSTGRES_IMAGE) as $CONTAINER on 127.0.0.1:$E2E_DB_PORT"
CONTAINER_STARTED=1
# The passwords reach docker through its environment (-e NAME), never its arguments.
POSTGRES_PASSWORD=$DB_OWNER_PASSWORD POSTGRES_APP_PASS=$DB_APP_PASSWORD docker run -d \
	--name "$CONTAINER" \
	--label "$CONTAINER_LABEL" \
	--publish "127.0.0.1:$E2E_DB_PORT:5432" \
	--tmpfs /var/lib/postgresql/data \
	--env POSTGRES_PASSWORD \
	--env POSTGRES_APP_PASS \
	--env "POSTGRES_USER=$DB_OWNER" \
	--env "POSTGRES_DB=$DB_NAME" \
	--env "POSTGRES_APP_USER=$DB_APP_ROLE" \
	--volume "$API_DIR/scripts/db-init:/docker-entrypoint-initdb.d:ro" \
	"$POSTGRES_IMAGE" >/dev/null

check_alive() {
	[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = true ] || {
		docker logs "$CONTAINER" 2>&1 | tail -n 40 >&2
		die "the Postgres container stopped."
	}
}
# TCP only answers once the image's init scripts (the runtime role) have run.
wait_until "Postgres" docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U "$DB_OWNER" -d "$DB_NAME"

# ----- 2. the API --------------------------------------------------------------------------------

# The API gets a clean environment: only what Maven and the JVM need, plus the E2E_* settings its e2e
# profile reads. A developer's SPRING_*, SERVER_* or POSTGRES_* variables, or an .env file (the
# working directory is a scratch one), can never redirect it at another database.
write_env() {
	printf "export %s='%s'\n" "$1" "$(printf '%s' "$2" | sed "s/'/'\\\\''/g")" >>"$API_ENV_FILE"
}
(umask 077 && : >"$API_ENV_FILE")
for name in PATH HOME USER LOGNAME LANG LC_ALL TMPDIR TZ JAVA_HOME MAVEN_OPTS MAVEN_ARGS MAVEN_HOME M2_HOME \
	HTTP_PROXY HTTPS_PROXY NO_PROXY http_proxy https_proxy no_proxy; do
	eval "is_set=\${$name+set}"
	if [ -n "$is_set" ]; then
		eval "write_env $name \"\$$name\""
	fi
done
write_env E2E_API_PORT "$E2E_API_PORT"
write_env E2E_APP_ORIGIN "$APP_ORIGIN"
write_env E2E_DB_PORT "$E2E_DB_PORT"
write_env E2E_DB_NAME "$DB_NAME"
write_env E2E_DB_OWNER_USER "$DB_OWNER"
write_env E2E_DB_OWNER_PASSWORD "$DB_OWNER_PASSWORD"
write_env E2E_DB_APP_USER "$DB_APP_ROLE"
write_env E2E_DB_APP_PASSWORD "$DB_APP_PASSWORD"

say "starting the API ($E2E_LAUNCHER via spring-boot:test-run in $API_DIR) on $API_ORIGIN"
(
	cd "$API_DIR"
	exec env -i /bin/sh -c '. "$0" && exec ./mvnw "$@"' "$API_ENV_FILE" \
		-B \
		-Dcheckstyle.skip=true \
		-Djacoco.skip=true \
		-DskipEnvParity=true \
		spring-boot:test-run \
		"-Dspring-boot.run.main-class=$E2E_LAUNCHER" \
		"-Dspring-boot.run.workingDirectory=$STACK_DIR/api-workdir"
) </dev/null >"$API_LOG" 2>&1 &
API_PID=$!

check_alive() {
	kill -0 "$API_PID" 2>/dev/null || {
		show_log_tail "$API_LOG"
		die "the API stopped before it was ready."
	}
}
wait_until "The API" curl -fsS -o /dev/null "http://127.0.0.1:$E2E_API_PORT/actuator/health"
rm -f "$API_ENV_FILE"

# ----- 3. the app --------------------------------------------------------------------------------

# A production build, not the dev server: the dev server's HMR client reloads the page when its socket
# drops mid-navigation (Firefox aborts page.goto), and its devtools add web storage of their own.
say "building the app against $API_ORIGIN"
cd "$APP_DIR"
VITE_API_BASE_URL=$API_ORIGIN node node_modules/vite/bin/vite.js build \
	--outDir "$STACK_DIR/dist" --emptyOutDir --logLevel warn >"$STACK_DIR/build.log" 2>&1 || {
	show_log_tail "$STACK_DIR/build.log"
	die "the app build failed."
}

say "serving the app on $APP_ORIGIN"
node node_modules/vite/bin/vite.js preview \
	--outDir "$STACK_DIR/dist" --host 127.0.0.1 --port "$E2E_APP_PORT" --strictPort \
	</dev/null >"$APP_LOG" 2>&1 &
APP_PID=$!

check_alive() {
	kill -0 "$APP_PID" 2>/dev/null || {
		show_log_tail "$APP_LOG"
		die "the app server stopped before it was ready."
	}
}
wait_until "The app server" curl -fsS -o /dev/null "http://127.0.0.1:$E2E_APP_PORT/"

# ----- 4. Playwright -----------------------------------------------------------------------------

# WebKit refuses the Secure Session cookie over http://localhost (see README), so without an explicit
# --project the suite runs the browsers that can hold a Session here.
has_project=
for argument in "$@"; do
	case $argument in
		--project | --project=*) has_project=1 ;;
	esac
done
if [ -z "$has_project" ]; then
	set -- --project=chromium --project=firefox "$@"
fi

export E2E_APP_PORT E2E_API_PORT
say "running Playwright: $*"
set +e
"$APP_DIR/node_modules/.bin/playwright" test --config "$APP_DIR/playwright.fullstack.config.ts" "$@"
status=$?
set -e
exit "$status"
