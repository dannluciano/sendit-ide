all:
	docker-compose up --build

run: build
	docker-compose up

build:
	docker-compose build --parallel