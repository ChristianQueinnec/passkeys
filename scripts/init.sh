#! /bin/bash

USER=${USER:-admin}
PASSWORD=$(uuid | sed -e 's/-.*$//')
TEST=false
URL=http://localhost:3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage () {
    cat <<EOF
Usage: $0 [-u|-v|-e|-b|-i|-h|-t][-r]

Prepare the Passkeys webapp.
   -c    check if a server is available
   -u    create a default data/users.json
   -v    create a default vault
   -e    create a default .env
   -r    run Passkeys server
   -b    build and run the Passkeys backend
   -i    similar to -e -u -v -b -r
   -h    display usage
   -t   similar to -e -u -v but for tests

Examples:
  $0 -t -r     start a standalone server and run all tests
  $0 -i        start a standalone server (without docker)
EOF
}

create_users () {
    mkdir -p data/
    echo "		*** Welcome to Passkeys ***"
    echo -e "Here are your login information:"
    echo
    echo -e "       login:       ${GREEN}${USER}${NC}"
    echo -e "       password:    ${GREEN}${PASSWORD}${NC}"
    echo
    echo -e "	${RED}Memorize this login and password, you will need them!${NC}"
    echo 
    cat > data/users.json <<EOF
[ { "username": "${USER}",
    "password": "${PASSWORD}" }
]
EOF
    chmod 600 data/users.json
}

create_test_users () {
    mkdir -p data/${USER}
    echo "Creating some users for tests"
    cat > data/users.json <<EOF
[ {"username":"admin", "password":"password"},
  {"username":"q", "password":"password"},
  {"username":"auth_test", "password":"password"},
  {"username":"history_test", "password":"password"},
  {"username":"deletion_test", "password":"password"},
  {"username":"pass_change_test", "password":"password"},
  {"username":"vault_change_test", "password":"password"},
  {"username":"no_vault_user", "password":"password"}
]
EOF
    chmod 600 data/users.json
}

create_vault () {
    mkdir -p data/${USER}/
    echo "Creating a sample vault"
    DATE=$(date "+%s")
    [[ -f data/${USER}/vault-init.vault ]] || \
    cat > data/${USER}/vault-init.vault <<EOF
[{
    "group": "",
    "title": "log on example",
    "username": "me@example.org",
    "password": "${PASSWORD}",
    "site": "https://ex.ample.org/",
    "tags": ["test"],
    "notes": "A sample password entry",
    "created": ${DATE},
    "modified": ${DATE}
  },
  {
    "group": "test/in",
    "title": "me",
    "username": "${USER}",
    "password": "${PASSWORD}",
    "site": "https://localhost:3000/",
    "tags": ["test", "example"],
    "notes": "Another sample password entry",
    "created": ${DATE},
    "modified": ${DATE}
  }
]
EOF
    chmod 700 data
}

remove_test_vaults () {
    ( cd data/
      touch foobar
      for file in *
      do
          case "$file" in
              "users.json")
                  :
                  ;;
              *)
                  rm -rf $file
                  ;;
          esac
      done
    )
}

create_test_vault () {
    remove_test_vaults
    mkdir -p data/${USER}/
    DATE=$(date "+%s")
    cat > data/${USER}/vault-init.vault <<EOF
[{
    "group": "",
    "title": "log on example",
    "username": "me@example.org",
    "password": "${PASSWORD}",
    "site": "https://ex.ample.org/",
    "tags": ["test"],
    "notes": "A sample password entry",
    "created": ${DATE},
    "modified": ${DATE}
  },{
    "group": "sources/git",
    "title": "Git sources of Passkeys",
    "username": "you@example.org",
    "password": "${PASSWORD}",
    "site": "https://github.com/ChristianQueinnec/passkeys",
    "tags": ["test", "other"],
    "created": ${DATE},
    "modified": ${DATE}
  },{
    "group": "sources/git",
    "title": "User guide",
    "username": "you@example.org",
    "password": "${PASSWORD}",
    "site": "https://github.com/ChristianQueinnec/passkeys/user-guide.md",
    "tags": ["test", "other"],
    "created": ${DATE},
    "modified": ${DATE}
  },
  {
    "group": "test/in",
    "title": "me as ${USER}",
    "username": "${USER}",
    "password": "${PASSWORD}",
    "site": "https://localhost:3000/",
    "tags": ["test", "example"],
    "notes": "Another sample password entry",
    "created": ${DATE},
    "modified": ${DATE}
  }
]
EOF
    chmod 700 data
}

create_env () {
    cat > .env <<EOF
#! /bin/bash
export JWT_SECRET=$(openssl rand -hex 32)
EOF
    chmod 711 .env
}

create_test_env () {
    cat > .env <<EOF
#! /bin/bash
export JWT_SECRET=jwt-secret
EOF
    chmod 711 .env
}

build_and_run_backend () {
    echo "Building and running the Passkeys backend"
    source ./.env && \
    UID=$(id -u) \
    GID=$(id -g) \
    USER=${USER} \
       docker compose up --build
    echo "Browse now ${URL}"
}

run () {
    source ./.env
    npm run preview
}

test_run () {
    source ./.env
    make run.tests
}

check_server () {
    if curl --silent ${URL} > /dev/null
    then true
    else
        echo "No running server" >&2
        exit 1
    fi
}

if [ $# = 0 ]
then
    usage
    exit 1
fi

while getopts "ceuvbirth" OPT
do
    case "$OPT" in
        c|check)
            check_server
            ;;
        e|env)
            create_env
            ;;
        u|user*)
            create_users
            ;;
        v|vault)
            create_vault
            ;;
        b|build)
            build_and_run_backend
            ;;
        i|init)
            create_env
            create_users
            create_vault
            build_and_run_backend
            run
            ;;
        t|test)
            TEST=true
            USER=admin
            PASSWORD=password
            create_test_env
            create_test_users
            create_test_vault
            ;;
        r|run)
            if $TEST
            then
                test_run
            else
                run
            fi
            ;;
        h|help|*)
            usage
            ;;
    esac
done

# end of init.sh
