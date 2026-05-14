# Krovaa Backend

MongoDB-backed auth API for the Krovaa app.

## Environment

Create a `.env` file in this folder:

```bash
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/krovaa
JWT_SECRET=replace-this-with-a-long-random-string
```

## Run

```bash
cd backend
npm install
npm run dev
```

## Auth endpoints

- `POST /api/auth/register` with `email`, `password`, `retypePassword`
- `POST /api/auth/login` with `email`, `password`
- `GET /health`
