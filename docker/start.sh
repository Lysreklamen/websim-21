#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

[ -z "$TYPE" ] && TYPE=dev

docker-compose -f "$DIR/docker-compose.base.yml" -f "$DIR/docker-compose.$TYPE.yml" build app
docker-compose -f "$DIR/docker-compose.base.yml" -f "$DIR/docker-compose.$TYPE.yml" up "$@"
