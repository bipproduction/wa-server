#!/usr/bin/env bash

if docker images | grep -q "wa-server"; then
    echo "coba stop wa-server"
    docker stop wa-server
    echo "success"
    echo "soba hapus wa-server"
    docker remove wa-server
    echo "success"
fi

# echo "create dockerfile"
# echo "FROM node:18
# WORKDIR /makuro
# EXPOSE 3001
# " > dockerfile
# echo "success"

# echo "build image"
# docker build . -t wa-server
# echo success

# echo "menghapus docker file"
# rm dockerfile
# echo "success"

echo "coba run wa-server"
docker run -d -it -p 3001:3001 --name wa-server node:18
echo "success"
docker ps

docker exec -it wa-server bash -c "apt update && apt install -y git"
docker exec -it wa-server bash -c "git clone https://github.com/bipproduction/wa-server.git && cd wa-server && yarn install"
docker exec -it wa-server bash -c "npm i -g tsx"
docker exec wa-server bash -c "cd wa-server && tsx index.ts"

