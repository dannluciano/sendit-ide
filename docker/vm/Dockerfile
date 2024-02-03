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
    nyancat \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    curl

COPY ./bin/ /usr/local/bin


CMD ["bash"]