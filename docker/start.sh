#!/bin/bash

# Exit on first error
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd $DIR

USER="$(id -u):$(id -g)" docker-compose up "$@"
