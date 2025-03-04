# Running Gitea Backend with Docker Compose(STEP-1)

## Prerequisites

Before running the Gitea backend, ensure you have Docker installed. If you haven't installed it yet, follow the official Docker installation guide:

[Docker Installation Guide](https://docs.docker.com/engine/install/ubuntu/)

## Step 1: Create the `docker-compose.yml` File

Create a new file named `docker-compose.yml` in your project directory and paste the following content:

```yaml
version: "3"

networks:
  gitea:
    external: false

services:
  server:
    image: gitea/gitea:latest
    container_name: gitea
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__database__DB_TYPE=postgres
      - GITEA__database__HOST=db:5432
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=gitea
    restart: always
    networks:
      - gitea
    volumes:
      - ./gitea:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "3000:3000"
      - "222:22"
    depends_on:
      - db

  db:
    image: postgres:14
    restart: always
    environment:
      - POSTGRES_USER=gitea
      - POSTGRES_PASSWORD=gitea
      - POSTGRES_DB=gitea
    networks:
      - gitea
    volumes:
      - ./postgres:/var/lib/postgresql/data
```

## Step 2: Start Gitea with Docker Compose

Run the following command in the terminal where the `docker-compose.yml` file is located:

```sh
docker compose up -d
```

This will start the Gitea service along with a PostgreSQL database.

## Step 3: Access Gitea

Once the containers are running, open your browser and navigate to:

```
http://localhost:3000
```

Follow the on-screen instructions to create your primary admin account and complete the setup.

## Step 4: Verify Gitea is Running

To check if the containers are running, use:

```sh
docker ps
```

If needed, you can stop the services with:

```sh
docker-compose down
```
