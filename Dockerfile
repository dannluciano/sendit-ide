FROM ubuntu:20.04

EXPOSE 1234

COPY assets .

RUN python -m SimpleHTTPServer 1234