#!/usr/bin/env bash

if docker images | grep -q "wa-server"; then
    echo "coba stop wa-server"
    docker stop wa-server
    echo "success"
    echo "soba hapus wa-server"
    docker remove wa-server
    echo "success"
    echo "image wa-server telah ada , coaba hapus"
    docker rmi "wa-server"
    echo "success"
fi

echo "create dockerfile"
echo "FROM node:18
WORKDIR /makuro/wa-server
EXPOSE 3001
" > dockerfile
echo "success"

echo "build image"
docker build . -t wa-server
echo success


echo "coba run wa-server"
docker run -d -it -p 6000:3001 --name wa-server wa-server:latest
echo "success"
docker ps


