#!/bin/bash
# DCA Tracker — interactive TUI launcher
# Double-click in Finder to open. Manages the Next.js dev server on port 3000.
# bash 3.2 compatible. No dependencies. Pure ANSI escape codes.

# Navigate to script directory (macOS launches .command from $HOME)
cd "$(dirname "$0")" || exit 1
PROJECT_DIR="$(pwd)"

# ---------- config ----------
PORT=3000
LOG_FILE="$PROJECT_DIR/.dev.log"
URL="http://localhost:$PORT"

# ---------- color palette: Bitcoin Orange gradient ----------
# 6-stop vertical gradient for banner (dim → bright → dim)
C1=$'\033[38;2;80;50;0m'
C2=$'\033[38;2;140;90;0m'
C3=$'\033[38;2;210;140;10m'
C4=$'\033[38;2;255;180;40m'
C5=$'\033[38;2;210;140;10m'
C6=$'\033[38;2;140;90;0m'

# UI colors
ACCENT=$'\033[38;2;242;169;0m'
MUTED=$'\033[38;2;120;120;120m'
FG=$'\033[38;2;230;230;230m'
POS=$'\033[38;2;80;200;120m'
NEG=$'\033[38;2;220;80;80m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'

# Health indicator dots
DOT_ALIVE=$'\033[38;2;80;220;100m●'$'\033[0m'
DOT_DEAD=$'\033[38;2;220;80;80m●'$'\033[0m'

# ---------- global state ----------
DEV_PID=""
DEV_MODE=""           # "started" | "adopted"
DEV_START_TIME=""
SELECTED=0

MENU_ITEMS=(
    "Status"
    "Restart Dev Server"
    "Logs: Dev Server"
    "Open Browser"
    "Quit"
)
MENU_COUNT=${#MENU_ITEMS[@]}

# Layout rows (1-indexed)
BANNER_ROWS=16
STATUS_ROW=$((BANNER_ROWS + 1))
MENU_START_ROW=$((BANNER_ROWS + 4))
FOOTER_ROW=$((MENU_START_ROW + MENU_COUNT + 2))

# ---------- port helpers ----------
port_is_free() {
    ! lsof -ti:"$1" >/dev/null 2>&1
}

get_pid_on_port() {
    lsof -ti:"$1" 2>/dev/null | head -1
}

# ---------- health check ----------
is_alive() {
    local pid="$1"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

health_dot() {
    if is_alive "$1"; then
        printf "%b" "$DOT_ALIVE"
    else
        printf "%b" "$DOT_DEAD"
    fi
}

# ---------- process helpers ----------
start_dev() {
    # Truncate log on fresh start
    : > "$LOG_FILE"
    ( npm run dev >>"$LOG_FILE" 2>&1 ) &
    DEV_PID=$!
    DEV_START_TIME=$(date +%s)
}

stop_dev() {
    if [[ -n "$DEV_PID" ]]; then
        pkill -P "$DEV_PID" 2>/dev/null
        kill "$DEV_PID" 2>/dev/null
        wait "$DEV_PID" 2>/dev/null
    fi
    # Fallback: kill anything still on the port
    lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null
    DEV_PID=""
}

adopt_or_start_dev() {
    if port_is_free "$PORT"; then
        start_dev
        DEV_MODE="started"
    else
        DEV_PID=$(get_pid_on_port "$PORT")
        DEV_START_TIME=$(date +%s)
        DEV_MODE="adopted"
    fi
}

restart_dev() {
    if [[ "$DEV_MODE" == "adopted" ]]; then
        lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null
        sleep 1
    else
        stop_dev
    fi
    start_dev
    DEV_MODE="started"
}

# ---------- cleanup ----------
cleanup() {
    printf '\033[?25h'      # show cursor
    printf '\033[?1049l'    # exit alt screen
    printf '\033[?2026l'    # close any pending sync
    stty sane 2>/dev/null
    if [[ "$DEV_MODE" == "started" ]]; then
        stop_dev
    fi
    printf '\nSession ended.\n'
    exit 0
}
trap cleanup EXIT INT TERM HUP

# ---------- drawing: banner ----------
draw_banner() {
    printf '\033[1;1H'
    printf "\n"
    printf "  ${C1}██████╗   ██████╗ █████╗     ████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗ ${NC}\n"
    printf "  ${C2}██╔══██╗ ██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗${NC}\n"
    printf "  ${C3}██║  ██║ ██║     ███████║       ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ██████╔╝${NC}\n"
    printf "  ${C4}██║  ██║ ██║     ██╔══██║       ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗${NC}\n"
    printf "  ${C5}██████╔╝ ╚██████╗██║  ██║       ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║${NC}\n"
    printf "  ${C6}╚═════╝   ╚═════╝╚═╝  ╚═╝       ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝${NC}\n"
    printf "\n"
    printf "  ${DIM}${FG}sats · THB  ·  local first  ·  port ${PORT}${NC}\n"
}

# ---------- drawing: dynamic (status + menu + footer) ----------
draw_dynamic() {
    local row="$STATUS_ROW"
    local alive_label=""
    local mode_label=""

    if is_alive "$DEV_PID"; then
        alive_label="${POS}running${NC}"
    else
        alive_label="${NEG}stopped${NC}"
    fi

    if [[ "$DEV_MODE" == "adopted" ]]; then
        mode_label="${MUTED}adopted${NC}"
    elif [[ "$DEV_MODE" == "started" ]]; then
        mode_label="${MUTED}started${NC}"
    else
        mode_label="${MUTED}—${NC}"
    fi

    # Status line
    printf '\033[%d;1H\033[2K' "$row"
    printf "  ${ACCENT}▸${NC} dev server: %b  ·  %b  ·  pid ${MUTED}%s${NC}" "$alive_label" "$mode_label" "${DEV_PID:-—}"
    row=$((row + 1))
    printf '\033[%d;1H\033[2K' "$row"
    printf "  ${MUTED}url: %s${NC}" "$URL"
    row=$((row + 1))
    printf '\033[%d;1H\033[2K' "$row"

    # Menu
    row="$MENU_START_ROW"
    local i
    for (( i=0; i<MENU_COUNT; i++ )); do
        printf '\033[%d;1H\033[2K' "$row"
        local prefix="    "
        local suffix=""
        local name="${MENU_ITEMS[$i]}"

        # Trailing health dot for restart/logs menu entries
        case "$name" in
            "Restart Dev Server"|"Logs: Dev Server")
                suffix="  $(health_dot "$DEV_PID")"
                ;;
        esac

        if [[ "$i" == "$SELECTED" ]]; then
            prefix="  ${ACCENT}▸${NC} "
            printf "%s${BOLD}${ACCENT}%s${NC}%b" "$prefix" "$name" "$suffix"
        else
            printf "%s${FG}%s${NC}%b" "$prefix" "$name" "$suffix"
        fi
        row=$((row + 1))
    done

    row=$((row + 1))
    printf '\033[%d;1H\033[2K' "$row"
    printf "  ${DIM}${FG}↑/↓ navigate   enter select   q quit${NC}"
}

draw_full() {
    printf '\033[?2026h'
    printf '\033[1;1H\033[J'
    draw_banner
    draw_dynamic
    printf '\033[?2026l'
}

draw_partial() {
    printf '\033[?2026h'
    draw_dynamic
    printf '\033[?2026l'
}

# ---------- subviews ----------
format_uptime() {
    local start="$1"
    if [[ -z "$start" ]]; then
        printf "—"
        return
    fi
    local now diff h m s
    now=$(date +%s)
    diff=$((now - start))
    h=$((diff / 3600))
    m=$(((diff % 3600) / 60))
    s=$((diff % 60))
    if (( h > 0 )); then
        printf "%dh %02dm" "$h" "$m"
    elif (( m > 0 )); then
        printf "%dm %02ds" "$m" "$s"
    else
        printf "%ds" "$s"
    fi
}

view_status() {
    while true; do
        printf '\033[?2026h'
        printf '\033[1;1H\033[J'
        draw_banner
        printf "\n"
        printf "  ${BOLD}${FG}STATUS${NC}\n"
        printf "  ${MUTED}─────────────────────────────────────────────${NC}\n"
        printf "\n"

        local alive_str="${NEG}stopped${NC}"
        local uptime_prefix=""
        if is_alive "$DEV_PID"; then
            alive_str="${POS}running${NC}"
        fi
        if [[ "$DEV_MODE" == "adopted" ]]; then
            uptime_prefix="~"
        fi

        printf "  %-18s %b\n" "state"   "$alive_str"
        printf "  %-18s ${FG}%s${NC}\n" "mode"    "${DEV_MODE:-—}"
        printf "  %-18s ${FG}%s${NC}\n" "pid"     "${DEV_PID:-—}"
        printf "  %-18s ${FG}%s${NC}\n" "port"    "$PORT"
        printf "  %-18s ${FG}%s%s${NC}\n" "uptime" "$uptime_prefix" "$(format_uptime "$DEV_START_TIME")"
        printf "  %-18s ${FG}%s${NC}\n" "url"     "$URL"
        printf "  %-18s ${FG}%s${NC}\n" "log"     "$LOG_FILE"
        printf "\n"
        printf "  ${DIM}${FG}r refresh   b back   q quit${NC}\n"
        printf '\033[?2026l'

        IFS= read -rsn1 KEY
        case "$KEY" in
            "b"|"") return ;;
            "q") exit 0 ;;
            "r") continue ;;
        esac
    done
}

view_logs() {
    while true; do
        printf '\033[?2026h'
        printf '\033[1;1H\033[J'
        draw_banner
        printf "\n"
        printf "  ${BOLD}${FG}LOGS${NC}  ${MUTED}(tail 40 · %s)${NC}\n" "$LOG_FILE"
        printf "  ${MUTED}─────────────────────────────────────────────${NC}\n"
        if [[ -f "$LOG_FILE" ]]; then
            tail -40 "$LOG_FILE" | while IFS= read -r line; do
                printf "  ${DIM}${FG}%s${NC}\n" "$line"
            done
        else
            printf "  ${MUTED}(no log yet)${NC}\n"
        fi
        printf "\n"
        printf "  ${DIM}${FG}r refresh   b back   q quit${NC}\n"
        printf '\033[?2026l'

        IFS= read -rsn1 KEY
        case "$KEY" in
            "b"|"") return ;;
            "q") exit 0 ;;
            "r") continue ;;
        esac
    done
}

view_progress() {
    local msg="$1"
    printf '\033[?2026h'
    printf '\033[1;1H\033[J'
    draw_banner
    printf "\n"
    printf "  ${ACCENT}▸${NC} %s\n" "$msg"
    printf '\033[?2026l'
}

# ---------- action dispatch ----------
execute_action() {
    local name="${MENU_ITEMS[$SELECTED]}"
    case "$name" in
        "Status")
            view_status
            ;;
        "Restart Dev Server")
            view_progress "restarting dev server on port $PORT..."
            restart_dev
            sleep 1
            ;;
        "Logs: Dev Server")
            view_logs
            ;;
        "Open Browser")
            view_progress "opening $URL ..."
            open "$URL" 2>/dev/null
            sleep 1
            ;;
        "Quit")
            exit 0
            ;;
    esac
}

# ---------- preflight ----------
preflight() {
    if ! command -v npm >/dev/null 2>&1; then
        printf "npm not found. Install Node.js ≥ 20 first.\n"
        exit 1
    fi
    if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
        printf "package.json not found in %s\n" "$PROJECT_DIR"
        exit 1
    fi
    if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
        printf "node_modules/ missing. Running npm install...\n"
        npm install || { printf "npm install failed\n"; exit 1; }
    fi
}

# ---------- startup ----------
preflight

# Enter alt screen + hide cursor
printf '\033[?1049h'
printf '\033[?25l'
printf '\033[1;1H\033[J'
draw_banner
printf "\n"
printf "  ${ACCENT}▸${NC} starting up...\n"

adopt_or_start_dev

# Wait briefly if we started it (let Next.js boot start)
if [[ "$DEV_MODE" == "started" ]]; then
    printf "  ${DIM}${FG}waiting for Next.js to boot (port %s)...${NC}\n" "$PORT"
    # Poll up to ~10 seconds
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        if curl -s -o /dev/null http://localhost:"$PORT"/ 2>/dev/null; then
            break
        fi
        sleep 1
    done
fi

# ---------- main loop ----------
draw_full

while true; do
    IFS= read -rsn1 KEY
    if [[ "$KEY" == $'\x1b' ]]; then
        IFS= read -rsn2 ARROW
        case "$ARROW" in
            "[A")
                SELECTED=$(( (SELECTED - 1 + MENU_COUNT) % MENU_COUNT ))
                draw_partial
                ;;
            "[B")
                SELECTED=$(( (SELECTED + 1) % MENU_COUNT ))
                draw_partial
                ;;
        esac
    elif [[ "$KEY" == "" ]]; then
        execute_action
        draw_full
    elif [[ "$KEY" == "q" ]]; then
        exit 0
    elif [[ "$KEY" == "k" ]]; then
        SELECTED=$(( (SELECTED - 1 + MENU_COUNT) % MENU_COUNT ))
        draw_partial
    elif [[ "$KEY" == "j" ]]; then
        SELECTED=$(( (SELECTED + 1) % MENU_COUNT ))
        draw_partial
    fi
done
