#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  if [[ -n "${BACK_PID:-}" ]] && kill -0 "$BACK_PID" 2>/dev/null; then
    kill "$BACK_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONT_PID:-}" ]] && kill -0 "$FRONT_PID" 2>/dev/null; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[dev] Starting backend..."
(cd "$ROOT_DIR/server" && npm run dev) &
BACK_PID=$!

echo "[dev] Starting frontend..."
(cd "$ROOT_DIR" && npm run dev) &
FRONT_PID=$!

echo "[dev] Backend PID: $BACK_PID"
echo "[dev] Frontend PID: $FRONT_PID"
echo "[dev] Press Ctrl+C to stop both."

wait "$BACK_PID" "$FRONT_PID"
