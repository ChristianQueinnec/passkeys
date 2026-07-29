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
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys
# @cajou: 10 minutes

run :
	./scripts/init.sh -u -v -e -r

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
	npm run check
	npm run test:unit
#	npm run test:e2e
	m run.tests.e2e

run.tests.e2e :
	-rm -f /tmp/tests-e2e.txt
	npm run test:e2e || \
	for t in tests/e2e/*.spec.ts ; do \
		./scripts/init.sh -t ; \
		echo "			*** $$t ***" ; \
		npx playwright test --workers=1 $$t || { \
		sleep 1 ; npx playwright test --workers=1 $$t ; } || \
		echo "FAILURE $$t" >> /tmp/tests-e2e.txt ; done
	@echo; if [ -f /tmp/tests-e2e.txt ] ; then \
		echo "*********************** Tests failures:" ; \
		cat /tmp/tests-e2e.txt ; exit 1 ; else \
		echo "******* Successful end of all tests "; fi ; echo
	git tag -a "tests-OK-$$(date +%Y%m%d_%H%M%S)" -m "$$(date)" 

run.tests.with.container :
	export PASSKEYS_HOST=172.55.0.20 ; m run.tests.e2e

REMOTE=pk.queinnec.org
archive.container : tag.container import.remote.vaults
	-git tag -a "$$(cat passkeys.tag)" -m "version $$(cat passkeys.tag)" 
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	docker push registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker push registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker push registry.queinnec.org:5000/passkeys
	@echo "Maybe     m run.remote.container"
# Don't forget to be authenticated:
#    docker login registry.queinnec.org:5000 username: codegradx

run.remote.container : 
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	ssh ${REMOTE} make -C Passkeys do.run.remote.container
do.run.remote.container :
	if docker network ls | grep -q snipnet ; then true ; else \
	   docker network create --subnet 172.55.0.0/16 snipnet ; fi
	PASSKEYS=$$(cat passkeys.id) docker compose up -d

deploy : archive.container \
		run.container \
		run.tests.with.container \
		clean \
		run.remote.container

clean :
	-rm -f pass.*
	-rm -f *data/queinnec/init.vault
	-rm -f *data/queinnec/new.vault
	-rm -f *~
	-rm -f *.log

server.htpasswd : 
	htpasswd -c server.htpasswd queinnec

# {{{
# Refresh passwords from Keepass to Passkeys
#    Keepass   export as csv into ~/pass.csv
#    m install.new.vault run.remote.container clean
#    open https://pk.queinnec.org/
#       synchronize
#       remove init.vault

pass.json : ../pass.csv
	mv ../pass.csv .
	cd KeePass2Passkeys/ && make work
	mv pass.json realdata/${USER}/init.vault
	rm -f pass.json pass.csv
	@echo "Quick! let Passkeys cipher this vault!"

install.new.vault : 
	if [ -f ${HOME}/pass.csv ] ; then mv ${HOME}/pass.csv . ; else \
	  echo "FIRST: Export ~/pass.csv from Keepass" ; exit 1 ; fi
	cd KeePass2Passkeys/ && make work
	mv pass.json realdata/${USER}/new.vault
	-rm -f ${HOME}/pass.*
	rm -f pass.json pass.csv
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	@echo "Quick! let Passkeys cipher this vault!"

deploy.new.vault :
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	@echo "Quick! let Passkeys cipher this vault!"

import.remote.vaults :
	@echo This will import remote vaults locally.... ; sleep 10
	rsync -avu ${REMOTE}:Passkeys/realdata .

static/favicon-512.png : static/favicon.svg
	cd static/ && convert -geometry 512x512 favicon.svg favicon-512.png
static/favicon-192.png : static/favicon.svg
	cd static/ && convert -geometry 192x192 favicon.svg favicon-192.png

# }}}

# ############################## AI

# {{{ Run AI agent
run.gemini :
#	cd ${HOME}/IA/Gemini/ && npm update
	${HOME}/IA/Gemini/node_modules/.bin/gemini

run.claude :
	claude-desktop &

run.mistral :
#	cd ~/.local/share/uv/ ; rm -rf tools/mistral-vibe/
#   cd ~/.local/share/uv/ ; uv tool install --force mistral-vibe
	vibe
# write instructions into vibe.md
# then ask vibe by typing:     @vibe.md

run.opencode :
# requires Ollama, very slow!
	grep OLLAMA_HOST /etc/systemd/system/ollama.service
	rsync -avu /usr/share/ollama/.ollama/ /home/queinnec/.ollama/
#	${HOME}/IA/OpenCode/.opencode/bin/opencode
	${HOME}/.opencode/bin/opencode

run.codex :
	${HOME}/IA/Codex/node_modules/.bin/codex
# write instructions into vibecodex.md
# then ask codex by typing:    @vibecodex.md
# or copy/paste from questions.md

run.cursor :
# NOT YET CONFIGURED
	${HOME}/.local/bin/agent --list-models
	${HOME}/.local/bin/agent --trust --plan


# Newer Claude not available on Linux, continue on Mac:
continue.on.mac : copy.to.mac
	ssh bijou make -C Passkeys do.continue.on.mac
	@echo "run Claude"

copy.to.mac :
	rsync -avu . bibou:Passkeys/

do.continue.on.mac :
	rm -rf package-lock.json node_modules/
	npm install
	npx playwright install

# }}}
# {{{ Experimentations

process.passkeys.with.codex :
	graphify extract . --code-only
# open codex
# /graphify does not work
# graphify extract . --code-only  # generates ./graphify-out/
# open -a obsidian
#   open folder ~/Passkeys/graphify-out/
# after updates
	graphify . --update --code-only
	graphify cluster-only . --backend codex


# }}}
