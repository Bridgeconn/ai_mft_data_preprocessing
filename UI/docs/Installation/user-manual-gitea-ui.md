# Running the Gitea-UI(STEP-2)

## Step 1: Clone or Download the Repository

Clone the repository from GitLab:

```sh
git clone https://gitlab.bridgeconn.com/software/development/vachan/git-explorer-ui.git
cd git-explorer-ui
```

Or download the ZIP file and extract it.

## Step 2: Install pnpm

If you haven't installed `pnpm`, do so by running:

```sh
npm install -g pnpm
```

## Step 3: Install Dependencies

Run the following command to install the required dependencies:

```sh
pnpm install
```

## Step 4: Start the Development Server

Start the application by running:

```sh
pnpm run dev
```

Once started, the app should be accessible at:

```
http://localhost:3001
```

If the app is not accessible on that port, just see in which port the app is running and replace that with `3001`

That's it! Your frontend application is now running. 🚀

Now for to connect you backend and ui, Follow the `Oauth-configutation` mannual.
