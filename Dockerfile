FROM docker:latest

COPY ./bin/ttyd /usr/bin/ttyd

EXPOSE 7681
WORKDIR /root

CMD ["ttyd", "docker", "run", "-it", "--rm", "sendit-ide_vm"]