work :
	./scripts/init.sh

# Use docker to create the container:
create.container :
	date +%Y%m%d_%H%M%S | tr -d '\n' > passkeys.tag
	docker compose build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER}
	docker tag registry.queinnec.org:5000/passkeys \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker inspect -f '{{.Id}}' registry.queinnec.org:5000/passkeys | \
      sed -E -e 's/sha256://' -e 's/^(.{12}).*/\1/' > passkeys.id
	docker tag registry.queinnec.org:5000/passkeys \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
# @cajou: 10 minutes

run.container :
	docker compose up -d
	@echo "Browse http://localhost:3000"
	docker logs -f --tail 100 passkeys

run.tests :
	scripts/init.sh -t
	npm run tests

REMOTE=pk.queinnec.org
archive.container :
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	docker push registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker push registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker push registry.queinnec.org:5000/passkeys
# Don't forget to be authenticated:
#    docker login registry.queinnec.org:5000 username: codegradx

run.remote.container : archive.container 
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	ssh ${REMOTE} make -C Passkeys do.run.remote.container
do.run.remote.container :
	if docker network ls | grep -q snipnet ; then true ; else \
	   docker network create --subnet 172.55.0.0/16 snipnet ; fi
	PASSKEYS=$$(cat passkeys.id) docker compose up -d

clean :
	-rm -f pass.*
	-rm -f *data/queinnec/init.vault

server.htpasswd : server.password
	htpasswd -bc server.htpasswd queinnec `cat server.password`
