FROM ubuntu:24.04

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
# Tools
    build-essential \
    tmux \
    htop \
    btop \
    tree \
    curl \
    wget \
    httpie \
    git \
# Program Languages Runtimes
    nodejs \
    npm \
    python3 \
    python3-pip \
    python3-venv \
    openjdk-21-jdk-headless \
# Database
    sqlite3 \
# Editors
    nano \
    vim \
    emacs \
# TUI
    neofetch \
    nyancat \
    cmatrix \
# Remove APT CACHE
    && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.5.0/gcm-linux_amd64.2.5.0.deb
RUN dpkg -i gcm-linux_amd64.2.5.0.deb
RUN git config --global credential.helper cache
RUN git config --global credential.credentialStore cache

COPY ./bin/ /usr/local/bin

ENV PORT 8080
ENV HOST 0.0.0.0

CMD ["bash"]