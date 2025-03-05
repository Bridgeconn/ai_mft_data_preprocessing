# AI Model Fine tuning data cleaning

To make a tool for storing, parsing the bible text so as to serve as parallel corpora for the AI Model fine tuning scripts
## Implementation Details

Implemented Using
- Python 
- Fastapi framework 
- SQLAlchemy 
- Postgresql Database 
- Usfm-grammar 


## Installation Steps

### Set up locally for development 

We follow a fork-and-merge Git workflow:
- Fork the repo: [ai_mft_data_preprocessing](https://github.com/Bridgeconn/ai_mft_data_preprocessing) to your GitLab account.


#### Clone the Git Repository

```bash
git clone https://github.com/Bridgeconn/ai_mft_data_preprocessing.git
```

#### Set up Virtual Environment

```bash
python3 -m venv ENV
source ENV/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: If there is any issue while installing `psycopg2`, try installing `psycopg2-binary` instead.

#### Set up PostgreSQL Database

**Prerequisite**: PostgreSQL (refer to the [PostgreSQL website](https://www.postgresql.org/download/linux/ubuntu/) for installation and setup).

1. Log in to `psql` (command-line interface for PostgreSQL) using your username and password:

   ```bash
   sudo -i -u postgres
   psql
   ```

2. Create a new database with your desired name:

   ```sql
   CREATE DATABASE db_name;
   ```

3. Exit from `psql`:

   ```bash
   \q
   ```

4. Exit from the PostgreSQL terminal:

   ```bash
   exit
   ```

#### Set up Environmental Variables

Go to the home directory and open the `.bashrc` file:

```bash
cd
gedit .bashrc
```

Edit the following contents appropriately and paste them into the `.bashrc` file:

```bash
export AI_MFT_HOST="localhost"
export AI_MFT_POSTGRES_PORT="5432"
export AI_MFT_POSTGRES_USER="<db_user>"
export AI_MFT_POSTGRES_PASSWORD="<db_password>"
export AI_MFT_POSTGRES_DATABASE="<db_name>"
```


After editing the `.bashrc` file, refresh it by running:

```bash
. ~/.bashrc
```

or:

```bash
source ~/.bashrc
```

Alternatively, log out and log back in to refresh the `.bashrc` file.

#### Configuration

Ensure the database is configured and accessible.


#### Run the App

From the `cd BACKEND` folder:



Run the application:

   ```bash
   uvicorn main:app --reload
   ```

If all goes well, you should see the following message in the terminal:

```bash
INFO:     Started server process [17599]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

To run the app on another port, use the `--port` option. To enable debug mode, use the `--debug` option:

```bash
uvicorn main:app --port=7000 --debug
```

#### Run the App using Docker

Ensure `.env` file is created in the docker folder with following variables.
   ```bash
   AI_MFT_HOST=localhost
   AI_MFT_POSTGRES_PORT=5432
   AI_MFT_POSTGRES_USER=<username>
   AI_MFT_POSTGRES_PASSWORD=<password>
   AI_MFT_POSTGRES_DATABASE=<database_name>

   ```

From the `cd docker` folder:

   ```bash
    docker-compose up --build
   ```

To run the containers in detached mode

   ```bash
    docker-compose up --build -d
   ```

To check logs from your running Docker containers:

   ```bash
   docker logs <container_name>
   ```

To stop the App

   ```bash
   docker-compose down

   ```



#### Access Documentation

Once the app is running, access the documentation from your browser:
- Swagger Documentation: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Redoc Documentation: [http://127.0.0.1:8000](http://127.0.0.1:8000)
