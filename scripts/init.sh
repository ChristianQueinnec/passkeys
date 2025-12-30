#! /bin/bash

USER=${USER:-admin}
PASSWORD=$(uuid | sed -e 's/-.*$//')

usage () {
    cat <<EOF
Usage: $0 [-u|-v|-b|-i|-h|-t]

Prepare the Passkeys webapp.
   -u    create a default data/users.json
   -v    create a default vault
   -b    build and run the Passkeys backend
   -i    similar to -u -v -b
   -h    display usage
   -t   similar to -u -v (for tests)
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
    echo "Creating user: ${USER} and its associated password: ${PASSWORD}"
    echo "Note this login and password, you will need them!"
    cat > data/users.json <<EOF
[ {"username": "${USER}", "password": "${PASSWORD}"},
  {"username":"admin", "password":"password"},
  {"username":"q", "password":"q"},
  {"username":"auth_test", "password":"q"},
  {"username":"history_test", "password":"q"}
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
    "group": "",
    "title": "another log on example",
    "username": "me@example.org",
    "password": "${PASSWORD}",
    "site": "https://ex.ample.org/",
    "tags": ["test", "other"],
    "notes": "Another sample password entry",
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

while getopts "uvbith" OPT
do
    case "$OPT" in
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
            create_users
            create_vault
            build_backend
            ;;
        t|test)
            USER=admin
            PASSWORD=password
            create_test_users
            create_test_vault
            ;;
        h|help|*)
            usage
            ;;
    esac
done

# end of init.sh
