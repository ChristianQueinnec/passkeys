#! /bin/sh

export JWT_SECRET=$(cat $JWT_SECRET_FILE)

cd /app/ && node build
