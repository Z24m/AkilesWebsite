const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// NOTIFICATION CONFIGURATION
// ============================================
// Email recipient
const EMAIL_RECIPIENT = 'w305644@gmail.com';

// Note: File system operations disabled for Vercel serverless environment
// PDF generation and file logging not supported in serverless functions

// Outlook Mail transporter configuration
const transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, // use TLS
    tls: {
        ciphers: 'SSLv3'
    },
    auth: {
        user: process.env.OUTLOOK_EMAIL,
        pass: process.env.OUTLOOK_PASSWORD
    }
});

// Helper function to log message (serverless compatible)
function logMessage(messageData) {
    console.log('Contact form submission:', {
        timestamp: new Date().toISOString(),
        name: messageData.name,
        email: messageData.email,
        phone: messageData.phone || 'Not provided',
        subject: messageData.subject || 'General Inquiry',
        message: messageData.message
    });
}

// Note: PDF generation disabled for serverless environment

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create contacts table
db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ============================================
// BASIC MIDDLEWARE
// ============================================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'Public')));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'AKILES website server is running',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

// Contact form submission - handle Vercel serverless function routing
app.post('/api/v1/contact', async (req, res) => {
    console.log('Contact form submission received:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    
    // Set JSON response headers
    res.setHeader('Content-Type', 'application/json');

    try {
        const { name, email, phone, subject, message } = req.body;

        console.log('Parsed form data:', { name, email, phone, subject, message });

        // Basic validation
        if (!name || !email || !message) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required'
            });
        }

        // Save to database
        db.run(
            `INSERT INTO contacts (name, email, phone, subject, message, status)
             VALUES (?, ?, ?, ?, ?, 'unread')`,
            [name, email, phone || null, subject || 'General Inquiry', message],
            async function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to save contact submission'
                    });
                }

                // Save message to text file
                try {
                    saveMessageToFile({ name, email, phone, subject, message });
                } catch (fileErr) {
                    console.error('Failed to save message to file:', fileErr);
                }

                // Create PDF
                let pdfPath;
                try {
                    pdfPath = await createMessagePDF({ name, email, phone, subject, message });
                } catch (pdfErr) {
                    console.error('Failed to create PDF:', pdfErr);
                }

                // Send email notification via Outlook
                if (process.env.OUTLOOK_EMAIL && process.env.OUTLOOK_PASSWORD) {
                    try {
                        const mailOptions = {
                            from: `"AKILES Website" <${process.env.OUTLOOK_EMAIL}>`,
                            to: EMAIL_RECIPIENT,
                            replyTo: email,
                            subject: `New Contact Form: ${subject || 'General Inquiry'}`,
                            html: `
                                <h2>New Message from AKILES Website</h2>
                                <p><strong>Name:</strong> ${name}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                                <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                                <hr>
                                <p><strong>Message:</strong></p>
                                <p>${message.replace(/\n/g, '<br>')}</p>
                                <hr>
                                <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
                                <p>A PDF copy has been saved to the contact-pdfs folder.</p>
                            `,
                            text: `New Message from AKILES Website

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject || 'General Inquiry'}

Message:
${message}

Submitted: ${new Date().toLocaleString()}
A PDF copy has been saved to the contact-pdfs folder.`
                        };

                        // Attach PDF if created
                        if (pdfPath) {
                            mailOptions.attachments = [{
                                filename: path.basename(pdfPath),
                                path: pdfPath
                            }];
                        }

                        await transporter.sendMail(mailOptions);
                        console.log('Email sent via Outlook to:', EMAIL_RECIPIENT);
                    } catch (emailErr) {
                        console.error('Failed to send email:', emailErr);
                    }
                } else {
                    console.log('Outlook email not configured. Message saved to PDF and text file only.');
                }

                res.status(201).json({
                    success: true,
                    message: 'Thank you for your message! We will get back to you soon.',
                    data: {
                        id: this.lastID,
                        name,
                        email,
                        subject: subject || 'General Inquiry',
                        submittedAt: new Date().toISOString()
                    }
                });
            }
        );
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process contact form',
            details: error.message
        });
    }
});

// Fallback contact route for Vercel serverless environment
app.post('/contact', async (req, res) => {
    console.log('Fallback contact route triggered:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        headers: req.headers,
        body: req.body
    });

    // Forward to main contact handler
    return app._router.handle({ ...req, url: '/api/v1/contact', path: '/api/v1/contact' }, res);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
    console.log('Route not found:', {
        method: req.method,
        url: req.url,
        path: req.path
    });
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        details: err.message
    });
});

// ============================================
// DIRECT CONTACT HANDLER FOR VERCEL
// ============================================
async function handleContact(req, res) {
    try {
        console.log('Direct contact handler called:', {
            method: req.method,
            url: req.url,
            body: req.body
        });
        
        // Set JSON headers
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }
        
        const { name, email, phone, subject, message } = req.body;
        
        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required'
            });
        }
        
        // Log the message (serverless compatible)
        logMessage({ name, email, phone, subject, message });
        
        // Send email notification if configured
        if (process.env.OUTLOOK_EMAIL && process.env.OUTLOOK_PASSWORD) {
            try {
                const mailOptions = {
                    from: `"AKILES Website" <${process.env.OUTLOOK_EMAIL}>`,
                    to: EMAIL_RECIPIENT,
                    replyTo: email,
                    subject: `New Contact Form: ${subject || 'General Inquiry'}`,
                    html: `
                        <h2>New Message from AKILES Website</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                        <hr>
                        <p><strong>Message:</strong></p>
                        <p>${message.replace(/\n/g, '<br>')}</p>
                        <hr>
                        <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
                    `,
                    text: `New Message from AKILES Website

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject || 'General Inquiry'}

Message:
${message}

Submitted: ${new Date().toLocaleString()}`
                };

                await transporter.sendMail(mailOptions);
                console.log('Email sent to:', EMAIL_RECIPIENT);
            } catch (emailErr) {
                console.error('Failed to send email:', emailErr);
                // Continue even if email fails
            }
        }
        
        console.log('Contact form processed successfully:', { name, email });
        
        return res.status(200).json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.',
            data: {
                name,
                email,
                subject: subject || 'General Inquiry',
                submittedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Contact handler error:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            success: false,
            error: 'Failed to process contact form',
            details: error.message
        });
    }
}

// ============================================
// VERCEL SERVERLESS FUNCTION HANDLER
// ============================================
module.exports = async (req, res) => {
    // Log incoming request
    console.log('Vercel function called:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
    });
    
    // Handle contact API directly
    if (req.url === '/api/v1/contact' || req.url.includes('contact')) {
        return await handleContact(req, res);
    }
    
    // Handle health check
    if (req.url === '/api/health') {
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            success: true,
            message: 'AKILES website server is running',
            timestamp: new Date(),
            version: '1.0.0'
        });
    }
    
    // Handle other requests through Express app
    return app(req, res);
};
