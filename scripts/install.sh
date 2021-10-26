#! /bin/bash

set -e

if (( $EUID != 0 )); then
    echo "===> Run with root User"
    exit 1
fi

echo "===> Building Docker VM Image"
docker build -f docker/vm/Dockerfile -t sendit-ide_vm ..

echo "===> Instaling ttyd"
cp ./bin/ttyd /usr/bin/
cp ./configs/ttyd.service /etc/systemd/system/ttyd.service

echo "===> Updating Systemd Unit"
systemctl daemon-reload
systemctl enable ttyd
systemctl restart ttyd
systemctl restart nginx