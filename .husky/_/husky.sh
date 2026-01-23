#!/usr/bin/env sh
# Husky - Git hooks manager shim
# Initializes environment and re-executes the hook script.

if [ -z "${husky_skip_init-}" ]; then
  husky_debug() {
    [ "${HUSKY_DEBUG:-}" = "1" ] && printf '%s\n' "husky (debug) - $1"
  }

  hook_name="$(basename -- "$0")"
  readonly hook_name

  husky_debug "starting $hook_name..."

  if [ "${HUSKY-}" = "0" ]; then
    husky_debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f "${HOME}/.huskyrc" ]; then
    husky_debug "sourcing ~/.huskyrc"
    # shellcheck disable=SC1090
    . "${HOME}/.huskyrc"
  fi

  husky_skip_init=1
  readonly husky_skip_init
  export husky_skip_init

  # Re-run the current hook script with husky initialized.
  sh -e "$0" "$@"
  husky_exit_code="$?"

  if [ "$husky_exit_code" = "0" ]; then
    husky_debug "$hook_name completed"
  else
    printf '%s\n' "husky - $hook_name hook exited with code $husky_exit_code (error)"
  fi

  exit "$husky_exit_code"
fi
