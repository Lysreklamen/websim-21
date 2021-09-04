#!/bin/bash

# Exit on first error
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

[ -z "$TYPE" ] && TYPE=dev

USER="$(id -u):$(id -g)" docker-compose -f "$DIR/docker-compose.base.yml" -f "$DIR/docker-compose.$TYPE.yml" up "$@"
