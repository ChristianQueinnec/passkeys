#! /bin/bash

USER=${USER:-admin}
PASSWORD=$(uuid | sed -e 's/-.*$//')

usage () {
    cat <<EOF
Usage: $0 [-u|-v|-b|-i|-h|-t]

Prepare the Passkeys webapp.
   -u    create a default data/users.json
   -v    create a default vault
   -e    create a default .env
   -b    build and run the Passkeys backend
   -i    similar to -e -u -v -b
   -h    display usage
   -t   similar to -e -u -v but for tests
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
JWT_SECRET=$(openssl rand -hex 32)
EOF
}

create_test_env () {
    cat > .env <<EOF
JWT_SECRET=jwt-secret
EOF
}

build_backend () {
    echo "Building and running the Passkeys backend"
    UID=$(id -u) \
    GID=$(id -g) \
    USER=${USER} \
       docker compose up --build
    echo "Browse now http://localhost:3000"
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

while getopts "euvbith" OPT
do
    case "$OPT" in
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
            USER=admin
            PASSWORD=password
            create_test_env
            create_test_users
            create_test_vault
            ;;
        h|help|*)
            usage
            ;;
    esac
done

# end of init.sh
