work :
	./scripts/init.sh

# Use docker to create the container:
create.container :
	date +%Y%m%d_%H%M%S | tr -d '\n' > passkeys.tag
	docker buildx build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER} \
		-t passkeys:$$(cat passkeys.tag) .
	docker inspect -f '{{.Id}}' passkeys:$$(cat passkeys.tag) | \
      sed -E -e 's/sha256://' -e 's/^(.{12}).*/\1/' > passkeys.id

tag.container : 
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker tag passkeys:$$(cat passkeys.id) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys
# @cajou: 10 minutes

run :
	./scripts/init.sh -u -v -e 
	. ./.env && npm run preview

run.container :
	. ./.env && PASSKEYS=$$(cat passkeys.id) docker compose up -d
	@echo "Browse http://localhost:3000"
	docker logs -f --tail 100 passkeys

# Run the webapp in dev mode without container:
run.dev :
	./scripts/init.sh -t
	@echo "Browse now http://localhost:3000"
	. ./.env && npm run dev

# Run tests after checking that a server runs (dev mode or container):
run.tests :
	if curl --silent http://localhost:3000 > /dev/null ; then true ; else \
	  . ./.env && npm run dev & echo $$? > /tmp/passkeys.pid ; fi
	npm run check
	npm run test:unit
#	npm run test:e2e
	for t in tests/e2e/*.spec.ts ; do \
		./scripts/init.sh -t ; \
		echo "			*** $$t ***" ; \
		npx playwright test --workers=1 $$t || { \
		sleep 1 ; npx playwright test --workers=1 $$t ; } || \
		exit 1 ; done
	-kill -9 $$(cat /tmp/passkeys.pid) && rm -f /tmp/passkeys.pid

REMOTE=pk.queinnec.org
archive.container : tag.container
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
