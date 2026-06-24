FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y git openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

CMD ["bash"]