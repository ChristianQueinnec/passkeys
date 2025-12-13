work :

create.container :
	docker compose build

run.container :
	docker compose up -d
	@echo "Browse http://localhost:5137"
