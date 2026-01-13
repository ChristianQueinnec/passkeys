#! /bin/bash

USER=${USER:-admin}
PASSWORD=$(uuid | sed -e 's/-.*$//')
TEST=false
URL=http://localhost:3000

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
    echo "Creating one user: ${USER} and its associated password: ${PASSWORD}"
    echo "Note this login and password, you will need them!"
    cat > data/users.json <<EOF
[ { "username": "${USER}",
    "password": "${PASSWORD}" }
]
EOF
}

create_test_users () {
    mkdir -p data/${USER}
    echo "Creating some users for tests"
    cat > data/users.json <<EOF
[ {"username":"admin", "password":"password"},
  {"username":"q", "password":"password"},
  {"username":"auth_test", "password":"password"},
  {"username":"history_test", "password":"password"},
  {"username":"pass_change_test", "password":"password"},
  {"username":"vault_change_test", "password":"password"}
]
EOF
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
    "title": "me as ${USER}",
    "username": "${USER}",
    "password": "${PASSWORD}",
    "site": "https://localhost/",
    "tags": ["test", "example"],
    "notes": "Another sample password entry",
    "created": ${DATE},
    "modified": ${DATE}
  }
]
EOF
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
}

create_env () {
    cat > .env <<EOF
#! /bin/bash
export JWT_SECRET=$(openssl rand -hex 32)
EOF
    chmod a+x .env
}

create_test_env () {
    cat > .env <<EOF
#! /bin/bash
export JWT_SECRET=jwt-secret
EOF
    chmod a+x .env
}

build_backend () {
    echo "Building and running the Passkeys backend"
    UID=$(id -u) \
    GID=$(id -g) \
    USER=${USER} \
       docker compose up --build
    echo "Browse now ${URL}"
}

run () {
    source .env
    make run.demo    
}

test_run () {
    source .env
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

banner () {
    cat <<EOF
***************** Welcome to Passkeys
* Let me create some files before running the backend of Passkeys
EOF
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
            build_backend
            ;;
        i|init)
            banner
            create_env
            create_users
            create_vault
            build_backend
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
