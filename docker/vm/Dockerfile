FROM ubuntu:latest

ENV LANG C.UTF-8

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    build-essential \
    htop \
    cmatrix \
    nodejs \
    python3 \
    openjdk-11-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

CMD ["bash"]