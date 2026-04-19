# AKILES Hauling Services - Company Website

A simple company information website for AKILES Hauling Services with a contact form.

## About

AKILES Hauling Services is a trusted partner in logistics and transportation, offering reliable, secure, and punctual hauling services across Luzon since 2022.

## Features

- Company information and about section
- Services overview
- Client portfolio showcase
- Team information
- Contact form for inquiries

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Environment Setup:**
The `.env` file is already configured with default values:
```
PORT=5000
NODE_ENV=development
```

## Running the Server

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The website will be available at `http://localhost:5000`

## Contact Form API

The contact form submissions are stored in an in-memory SQLite database.

### Endpoint

- **POST `/api/v1/contact`** - Submit contact message
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "09171234567",
    "subject": "Service Inquiry",
    "message": "I would like to know more about your services"
  }
  ```

- **GET `/api/health`** - Server health status

## Project Structure

```
AKILES/
├── server.js              # Main server file (Express backend)
├── package.json           # Node.js dependencies
├── .env                   # Environment variables
├── index.html             # Main website page
├── style.css              # Website styles
├── Public/                # Static assets (images, etc.)
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Troubleshooting

**Port already in use:**
```bash
set PORT=3000
npm start
```

**Dependencies issues:**
```bash
rm node_modules package-lock.json
npm install
```

## Contact Form Messages

Every contact form submission creates:
1. **Text log** - `contact-messages.txt` (all messages in one file)
2. **PDF file** - `contact-pdfs/message-{timestamp}.pdf` (individual PDF for each message)
3. **Email** - Sent to w305644@gmail.com via Yahoo Mail (if configured)

### Message Storage Locations:

| Format | Location | Description |
|--------|----------|-------------|
| Text | `contact-messages.txt` | All messages in one readable file |
| PDF | `contact-pdfs/` folder | Individual PDF for each message |
| Email | w305644@gmail.com | Instant notification (optional) |

### Example Message Format (Text File):
```
========================================
NEW MESSAGE - 2026-04-19T03:30:00.000Z
========================================
Name: John Doe
Email: john@example.com
Phone: 09171234567
Subject: Service Inquiry
Message:
I would like to know more about your hauling services.
========================================
```

## Outlook Email Configuration (Optional)

To receive email notifications, set up an Outlook Mail account:

1. **Create Outlook Account** (or use existing): https://signup.live.com

2. **Enable SMTP Access:**
   - Go to https://account.live.com/proofs/Manage
   - Ensure your account has security info set up (phone number or alternate email)
   - For some accounts, you may need to create an App Password at https://account.microsoft.com/security

3. **Add credentials to `.env` file:**
   ```
   PORT=5000
   NODE_ENV=development
   OUTLOOK_EMAIL=your_outlook@outlook.com
   OUTLOOK_PASSWORD=your_outlook_password
   ```

4. **Restart the server:**
   ```bash
   npm start
   ```

**Note:** If Outlook email is not configured, messages are still saved to text and PDF files.

## Notes

- This is a static company information website
- Contact form messages are saved in 3 formats: text log, individual PDFs, and email (if configured)
- The `contact-pdfs/` folder is created automatically
- Each PDF is named with a timestamp: `message-2026-04-19T11-30-00-000Z.pdf`
