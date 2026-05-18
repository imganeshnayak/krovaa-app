# Krovaa Backend

MongoDB-backed auth API for the Krovaa app.

## Environment

Create a `.env` file in this folder:

```bash
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/krovaa
JWT_SECRET=replace-this-with-a-long-random-string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ganeshnayak8175@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=ganeshnayak8175@gmail.com
SMTP_FROM_NAME=Krovadotcom
```

## Run

```bash
cd backend
npm install
npm run dev
```

## Auth endpoints

- `POST /api/auth/register` with `email`, `password`, `retypePassword`
- `POST /api/auth/register/send-otp` with `email`, `password`, `retypePassword`
- `POST /api/auth/register/verify-otp` with `email`, `otp`
- `POST /api/auth/login` with `email`, `password`
- Each registered user receives a unique 6-character alphanumeric `userCode`.

## Profile endpoints

- `GET /api/profile` - Get current user profile (requires Authorization header with JWT token)
- `GET /api/profile/:userId` - Get user profile by ID (public)
- `PUT /api/profile` - Update user profile (requires Authorization header with JWT token)
  - Request body: `{ fullName?, location?, bio?, avatar?, skills? }`
- `PUT /api/profile/stats` - Update user stats (requires Authorization header with JWT token)
  - Request body: `{ jobsDone?, reviews?, earned? }`

## Health check

- `GET /health`
