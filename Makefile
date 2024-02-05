all: run
    @echo 'Listening on http://localhost'
run: build
	docker compose up --build -d && docker compose logs -f

build:
	docker compose build --parallel
