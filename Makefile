all: run
	@echo 'Listening on http://localhost:81'

down:
	docker compose down

run: build
	docker compose up --build -d && docker compose logs -f

build:
	docker compose build --parallel

logs:
	docker compose logs -f

watch:
	docker compose watch

update:
	git pull --rebase
	cp assets/index.html /etc/nginx/html/
	cp -r assets/ /etc/nginx/html/
	cp sendit-ide.service /etc/systemd/system
	systemctl daemon-reloads
	systemctl restart sendit-ide.service