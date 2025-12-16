work :

# Use docker to create the container:
create.container :
	docker compose build
# @cajou: 4 minutes

# But try to run it with docker:
	docker compose up -d
	@echo "Browse http://localhost:5137"
	docker logs -f --tail 100 passkeys