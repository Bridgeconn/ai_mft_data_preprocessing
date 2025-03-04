# User Manual - Admin

### Overview
This Application is a collaborative version control and project management platform designed specifically for team-based data storage and project coordination. This self-hosted solution provides a streamlined interface for managing code repositories, tracking versions, and facilitating team collaboration.

### URL
- UI - https://gitea-ui.vercel.app/sign-in
- Backend - https://dev.gitea.vachanengine.org/

### WorkFlow

**1. Authentication**
- Signing Up:
  1. Click the "Sign Up" link on the login page
  2. Enter required details:
     - Username
     - Email address (only bridgeconn id's)
     - Password (must meet security requirements)
  3. Click "Register Account" to complete registration
  4. Check email for verification (if required)

- Logging In:
  1. Navigate to the login page
  2. Enter your username(email Id is disabled now)
  3. Enter your password
  4. Click "Login" to access your account

**2. My Profile**
  1. Access user menu via profile dropdown in top-right:

**3. List Projects**
  1. It will show the list of public and private projects assigned with the following details :
     - Project name with public/private status
     - Last modification date
     - Associated categories
     - Star count

**4. Search Projects**
  1. Search feature with below options:
     - Type the project name to filter results in real time. 
     - Type category and press enter to search using category
     - Click on the category tag to filter by category

**5. Download Project List**
     - Click download icon to download project list in excel formats
     - The project list displays the name, topics, and metadata of all projects associated with the user.

**6. Users List**
1. Navigate to Users tab to see list of registered users
2. Filter User's  with username

**7. Users Profile**
1. Access User's Profiles page by clicking on username

**8. File Explorer View on Open Project**
1. View Files and Folders
2. Search Files
3. Copy Project URL

**9. Download project in Zip format**
 - You can downlaod each projects in zip format from inside the file Explore view

**10. Star the Project**
 - Click star icon inside the file explore view to favorite projects.

**11. File Preview Options**
1. Preview by Type:
   - Text: View, copy, download
   - Image: View, download
   - Excel: View/Raw, download
   - Markdown: View/RawView, download
   - CSV: View View/RawView, download
   - Audio: Play, download, delete
   - PDF : View, Download, delete

**12. View Release**
 - List available releases 

**13. Download Release**
   - Click ZIP for compressed download
   - Click TAR for alternative format

**14. Project Details**
1. View current metadata

**15. Logout Process**
1. Click profile dropdown in header
2. Select "Logout"
3. App returns to login page
