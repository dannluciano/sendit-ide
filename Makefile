all: run
    @echo 'Listening on http://localhost'
run: build
	docker-compose up

build:
	docker-compose build --parallel
