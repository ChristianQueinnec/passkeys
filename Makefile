work :
	./scripts/init.sh

# Use docker to create the container:
create.container : check.docker.configuration generate.doc
	date +%Y%m%d_%H%M%S | tr -d '\n' > passkeys.tag
	docker buildx build \
		--build-arg UID=$$(id -u) \
		--build-arg GID=$$(id -g) \
		--build-arg USER=$${USER} \
		-t passkeys:$$(cat passkeys.tag) .
	docker inspect -f '{{.Id}}' passkeys:$$(cat passkeys.tag) | \
      sed -E -e 's/sha256://' -e 's/^(.{12}).*/\1/' > passkeys.id
# @cajou 12 min

tag.container : check.docker.configuration
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.tag)
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys:$$(cat passkeys.id)
	docker tag passkeys:$$(cat passkeys.tag) \
		registry.queinnec.org:5000/passkeys
	git commit -m 'Tagged' passkeys.id passkeys.tag
	-git push
# @cajou: 10 minutes

run :
	./scripts/init.sh -u -v -e -r

check.docker.configuration :
	if [ -d /Applications ] ; then true ; else \
	cd ${HOME}/.docker/ && cp -p config.json.linux config.json ; fi

run.container : check.docker.configuration
	. ./.env && PASSKEYS=$$(cat passkeys.id) docker compose up -d
	@echo "Browse http://localhost:3000"
	docker logs -f --tail 100 passkeys

# Run the webapp in dev mode without container:
run.dev :
	./scripts/init.sh -t
	@echo "Browse now http://localhost:3000"
	. ./.env && npm run dev
# Use admin and password (see scripts/init.sh), the vault password is password

# Run tests after checking that a server runs (dev mode or container):
run.tests :
	npm run check
	npm run test:unit
	npm run test:scripts
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

run.remote.container : check.docker.configuration regenerate.env
	rsync -avu --exclude='*~' . ${REMOTE}:Passkeys/
	ssh ${REMOTE} make -C Passkeys do.run.remote.container
do.run.remote.container :
	if docker network ls | grep -q snipnet ; then true ; else \
	   docker network create --subnet 172.55.0.0/16 snipnet ; fi
	-docker rm -f passkeys
	docker compose up -d

generate.doc :
	for f in *guid*.md ; do pandoc -s $$f -o static/$${f%.md}.html ; done

regenerate.env :
	{ echo "JWT_SECRET=jwt-secret" ;\
	  echo "PASSKEYS=$$(cat passkeys.id)" ; } > .env

deploy : archive.container \
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


# {{{ Generate executable

generate.for.linux : scripts/package-local.sh
	-rm -rf dist/
	-rm -rf ${HOME}/.config/passkeys/
	npm run package:linux
	@echo " *** Run dist/passkeys-linux-x64/passkeys"
	@cat ${HOME}/.config/passkeys/users.json
	@echo " *** then browse http://127.0.0.1:54123"
# @cajou: 10s

# }}}

# ############################## AI

# {{{ Run AI agent
run.gemini :
#	cd ${HOME}/IA/Gemini/ && npm update
	${HOME}/IA/Gemini/node_modules/.bin/gemini
# Gemini API key to be found in https://aistudio.google.com/app/api-keys

run.claude :
	claude-desktop &

run.antigravity :
	open -a 'Antigravity IDE'

run.mistral :
#	cd ~/.local/share/uv/ ; rm -rf tools/mistral-vibe/
#   cd ~/.local/share/uv/ ; uv tool install --force mistral-vibe
	vibe
# write instructions into vibe.md
# then ask vibe by typing:     @vibe.md

run.codex :
	${HOME}/IA/Codex/node_modules/.bin/codex
# copy/paste from questions.md
# type `process vibe.md`
# Note: codex really uses graphify!

run.opencode :
# requires Ollama, very slow!
	grep OLLAMA_HOST /etc/systemd/system/ollama.service
	rsync -avu /usr/share/ollama/.ollama/ /home/queinnec/.ollama/
#	${HOME}/IA/OpenCode/.opencode/bin/opencode
	${HOME}/.opencode/bin/opencode

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

# install Graphify within ~/IA/Graphify

process.passkeys :
	${HOME}/.local/bin/graphify extract . --code-only
	${HOME}/.local/bin/graphify cluster-only .
# open codex
# /graphify does not work
# graphify extract . --code-only  # generates ./graphify-out/
# open -a obsidian
#   open folder ~/Passkeys/graphify-out/
# after updates
re.process.passkeys :
	OLLAMA_BASE_URL="http://${OLLAMA_HOST}" \
	OLLAMA_API_KEY=aaa \
	graphify extract . \
		--backend ollama --model qwen2.5:7b
# open file:/home/queinnec/Passkeys/graphify-out/graph.html
# obsidian ./graphify-out/GRAPH_REPORT.md

# }}}


# {{{ Git stuff
revert.to.before.153 :
	git revert ec65d071def..HEAD
# }}}
