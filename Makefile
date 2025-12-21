work :
	./scripts/init.sh

# Use docker to create the container:
create.container :
	docker compose build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER}
# @cajou: 10 minutes

run.container :
	docker compose up -d
	@echo "Browse http://localhost:3000"
	docker logs -f --tail 100 passkeys
