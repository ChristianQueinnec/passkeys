work :
	./scripts/init.sh

# Use docker to create the container:
XXX.create.container :
	date +%Y%m%d_%H%M%S | tr -d '\n' > passkeys.tag
	docker compose build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER}
	docker tag registry.queinnec.org:5000/passkeys \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker inspect -f '{{.Id}}' registry.queinnec.org:5000/passkeys | \
      sed -E -e 's/sha256://' -e 's/^(.{12}).*/\1/' > passkeys.id
	docker tag registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
# @cajou: 10 minutes

create.container :
	date +%Y%m%d_%H%M%S | tr -d '\n' > passkeys.tag
	docker buildx build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER} \
		-t registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag) .
	docker inspect -f '{{.Id}}' registry.queinnec.org:5000/passkeys | \
      sed -E -e 's/sha256://' -e 's/^(.{12}).*/\1/' > passkeys.id
	docker tag registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker tag registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys
# @cajou: 10 minutes

run.container :
	PASSKEYS=$$(cat passkeys.id) docker compose up -d
	@echo "Browse http://localhost:3000"
	docker logs -f --tail 100 passkeys

# Run the webapp in dev mode without container:
run.demo :
	./scripts/init.sh -t
	@echo "Browse now http://localhost:3000"
	. ./.env && npm run dev

# Run tests after checking that a server runs (dev mode or container):
run.tests :
	scripts/init.sh -t
	if curl --silent http://localhost:3000 > /dev/null ; then true ; else \
	  . ./.env && npm run dev ; fi & sleep 2
	npm run test:unit
	npm run test:e2e


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
	-rm -f *~
	-rm -f *.log

server.htpasswd : server.password
	htpasswd -bc server.htpasswd queinnec `cat server.password`

pass.json : pass.csv
	cd KeePass2Passkeys/ && make work
	mv pass.json realdata/${USER}/init.vault
	rm -f pass.json pass.csv
	@echo "Quick! let Passkeys cipher this vault!"
