FROM ubuntu:latest

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    build-essential \
    htop \
    cmatrix \
    nodejs \
    python3 \
    openjdk-11-jdk-headless \
    sqlite3 \
    nano \
    vim \
    tree \
    neofetch \
    && rm -rf /var/lib/apt/lists/*

CMD ["bash"]