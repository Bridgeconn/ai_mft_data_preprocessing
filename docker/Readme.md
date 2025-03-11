# Gitea Docker Setup Guide

## Introduction

This guide will help you set up Gitea using Docker. Gitea is a lightweight Git service that can be self-hosted. This guide assumes you have Docker and Docker Compose installed on your system.

## Prerequisites

- Docker
- Docker Compose

## Steps to Install Gitea

1. **Clone the Repository**
   Clone the repository containing the Docker Compose file and other necessary configurations.

   ```sh
   git clone https://github.com/Bridgeconn/ai_mft_data_preprocessing.git
   cd ai_mft_data_preprocessing
   ```

2. **Run Docker Compose**
   Start the Gitea service using Docker Compose.

   ```sh
   cd docker
   docker compose up -d
   ```

3. **Initial Setup of Gitea**
   When you first boot the Gitea image, you will be prompted to configure the database. Since the database configuration is already included in the Docker Compose file, you can proceed with the following steps:

   - **Database Configuration**: This step will be pre-configured based on your Docker Compose settings.
   - **SMTP Configuration**: You can skip this step if you do not need email notifications.
   - **Root Admin Creation**: This can be done later when you create the first user.

4. **Complete Installation**
   Click the "Install" button to complete the setup. Gitea will now be running.

5. **Accessing the Gitea**
   Open your web browser and navigate to the URL where Gitea is hosted. Refer to the UI documentation for detailed instructions on how to use the Gitea-UI and how you can setup the Oauth configuration.

## Additional Documentation

For more detailed instructions on using the Gitea UI, please refer to the [Gitea UI Documentation](https://github.com/Bridgeconn/ai_mft_data_preprocessing/tree/main/UI/docs/Installation).

## Adding variables

Once you have created a new application for oauth in the gitea, you will be having a `client-id` and `client-secret` . Make sure you add them to our docker compose file. Rest for the variables are already added.

## Note

Once you created the backend(Gitea), create a Organization named `BCS`. and make sure if you are creating repositories in the backend, create under the organization while if you are using the UI , then you dont have to worry on that.

## Conclusion

You have successfully set up Gitea using Docker. You can now start using Gitea for your Git repositories.
