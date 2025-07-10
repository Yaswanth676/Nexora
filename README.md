# Nexora

Nexora is a web application designed to help users manage their profiles, access interview resources, job listings, and roadmaps for learning. It features user authentication, profile management, and resource sharing.

## Features
- User registration and login
- User profile with editable information and social links
- Job listings and job details
- Interview resources and details
- Roadmaps for learning
- File uploads (PDFs, notes, etc.)
- Responsive UI with EJS templates and custom CSS

## Tech Stack
- Node.js
- Express.js
- EJS (Embedded JavaScript templates)
- PostgreSQL (database)
- Cloudinary (file uploads)
- Multer (file handling)
- Passport.js (authentication)
- Bootstrap Icons, Google Fonts

## Getting Started

### Prerequisites
- Node.js and npm installed
- PostgreSQL database

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/Yaswanth676/Nexora.git
   cd Nexora
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add your environment variables:
   ```env
   DB_PASSWORD=your_db_password
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   SESSION_SECRET=your_session_secret
   ```
4. Start the application:
   ```sh
   node app.js
   ```

The server will run on [http://localhost:3000](http://localhost:3000).

## Folder Structure
- `app.js` - Main application file
- `views/` - EJS templates for UI
- `public/` - Static assets (CSS, images)
- `uploads/` - Uploaded files
- `utils/` - Utility modules (e.g., Cloudinary config)

## License
This project is licensed under the ISC License. 