# OAuth Configuration(STEP-3)

## Step 1: Create an OAuth Application in Gitea

After running the backend, go to **Site Administration** in your profile settings from the top navigation bar. Navigate to **Integration** > **Applications**, then create a new OAuth2 application.

### Fill in the following details:

- **Application Name:** `gitea-ui`
- **Redirect URIs:**
  ```
  http://localhost:3001/oauth/callback
  ```
  If the frontend is running on a different port, update the URL accordingly.

After creating the application, you will get a **Client ID** and **Client Secret**.

## Step 2: Configure OAuth in the Frontend

Create a `.env.local` file in the Vite application root directory and add the following environment variables:

```env
VITE_GITEA_CLIENT_ID=<your_client_id>
VITE_GITEA_CLIENT_SECRET=<your_client_secret>
VITE_GITEA_REDIRECT_URI=http://localhost:3001/oauth/callback
```

Replace `<your_client_id>` and `<your_client_secret>` with the values generated in Gitea.

Now your OAuth setup is complete! 🎉
