work :

create.container :
	docker compose build
# @cajou: 4 minutes

run.container :
	docker compose up -d
	@echo "Browse http://localhost:5137"
	docker logs -f --tail 100 passkeys
