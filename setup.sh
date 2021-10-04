#! /bin/bash

set -e

if [ "$(uname)" == "Darwin" ]; then
    echo "==> OSX"
    brew install forego ttyd nginx python3
    brew install --cask docker
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    echo "==> Linux"
    SUDO=''
    if (( $EUID != 0 )); then
        SUDO='sudo'
    fi
    $SUDO 'apt install forego docker ttyd nginx python3'
else
    echo "==> Plataform not Supported"
fi

echo "==> Build Docker Image"
docker build . -t sendit
echo "==> Start Service"
forego start