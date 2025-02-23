# Math Game Server

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your credentials:

- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret key for JWT token generation (use a strong random string)
- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Your Gmail App Password

### Setting up Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Step Verification if not already enabled
3. Go to Security → App passwords
4. Generate a new app password:
   - Select app: Other (Custom name)
   - Name it "Math Game"
   - Copy the 16-digit password
5. Paste the password in your `.env` file as `GMAIL_APP_PASSWORD`

## Security Notes

- Never commit the `.env` file to version control
- Keep your app password secure
- Rotate the JWT secret and app password periodically
- The example values in `.env.example` are for illustration only
