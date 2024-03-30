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

deploy:
	git push dokku main

update:
	git pull --rebase
	cp -r assets/ /etc/nginx/html/
	docker compose -f docker-compose.prod.yml build
	cp sendit-ide.service /etc/systemd/system
	systemctl daemon-reload
	systemctl restart sendit-ide.service