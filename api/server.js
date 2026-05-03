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

// PDF folder - create if doesn't exist
const PDF_FOLDER = path.join(__dirname, 'contact-pdfs');
if (!fs.existsSync(PDF_FOLDER)) {
    fs.mkdirSync(PDF_FOLDER, { recursive: true });
    console.log('Created PDF folder:', PDF_FOLDER);
}

// Log file path
const MESSAGES_LOG_FILE = path.join(__dirname, 'contact-messages.txt');

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

// Helper function to save message to text file
function saveMessageToFile(messageData) {
    const timestamp = new Date().toISOString();
    const logEntry = `
========================================
NEW MESSAGE - ${timestamp}
========================================
Name: ${messageData.name}
Email: ${messageData.email}
Phone: ${messageData.phone || 'Not provided'}
Subject: ${messageData.subject || 'General Inquiry'}
Message:
${messageData.message}
========================================

`;
    fs.appendFileSync(MESSAGES_LOG_FILE, logEntry);
    console.log('Message saved to:', MESSAGES_LOG_FILE);
}

// Helper function to create PDF with AKILES theme
function createMessagePDF(messageData) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `message-${timestamp}.pdf`;
        const filepath = path.join(PDF_FOLDER, filename);
        
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filepath);
        
        doc.pipe(stream);
        
        // AKILES Brand Colors
        const primaryBlue = '#003d7a';
        const accentOrange = '#ff6b35';
        const lightGray = '#f5f5f5';
        const darkGray = '#333333';
        
        // Header background
        doc.rect(0, 0, 612, 120).fill(primaryBlue);
        
        // Company Logo
        const logoPath = path.join(__dirname, 'Public', 'images', 'Akiles.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 25, { width: 60 });
        }
        
        // Header text
        doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
        doc.text('AKILES', 120, 35);
        doc.fontSize(14).font('Helvetica');
        doc.text('Hauling Services', 120, 70);
        doc.fontSize(10);
        doc.text('Transporting Your Business with Commitment and Excellence', 120, 95);
        
        // Orange accent line
        doc.rect(0, 120, 612, 5).fill(accentOrange);
        
        // Document title
        doc.fillColor(primaryBlue).fontSize(20).font('Helvetica-Bold');
        doc.text('Contact Form Submission', 50, 145);
        
        // Date with icon-like styling
        doc.fillColor(accentOrange).fontSize(12).font('Helvetica-Bold');
        doc.text('Date:', 50, 185);
        doc.fillColor(darkGray).font('Helvetica');
        doc.text(`${new Date().toLocaleString()}`, 90, 185);
        
        // Section divider
        doc.rect(50, 210, 512, 1).fill('#dddddd');
        
        // Contact Information Section
        doc.fillColor(primaryBlue).fontSize(16).font('Helvetica-Bold');
        doc.text('Contact Information', 50, 230);
        
        // Info box background
        doc.roundedRect(50, 255, 512, 110, 5).fill(lightGray);
        
        // Contact details
        doc.fillColor(accentOrange).fontSize(12).font('Helvetica-Bold');
        let yPos = 270;
        doc.text('Name:', 70, yPos);
        doc.fillColor(darkGray).font('Helvetica');
        doc.text(messageData.name, 120, yPos);
        
        yPos += 25;
        doc.fillColor(accentOrange).font('Helvetica-Bold');
        doc.text('Email:', 70, yPos);
        doc.fillColor(darkGray).font('Helvetica');
        doc.text(messageData.email, 120, yPos);
        
        yPos += 25;
        doc.fillColor(accentOrange).font('Helvetica-Bold');
        doc.text('Phone:', 70, yPos);
        doc.fillColor(darkGray).font('Helvetica');
        doc.text(messageData.phone || 'Not provided', 120, yPos);
        
        yPos += 25;
        doc.fillColor(accentOrange).font('Helvetica-Bold');
        doc.text('Subject:', 70, yPos);
        doc.fillColor(darkGray).font('Helvetica');
        doc.text(messageData.subject || 'General Inquiry', 130, yPos);
        
        // Message Section
        yPos = 385;
        doc.fillColor(primaryBlue).fontSize(16).font('Helvetica-Bold');
        doc.text('Message', 50, yPos);
        
        // Message box
        yPos += 30;
        doc.roundedRect(50, yPos, 512, 150, 5).stroke('#dddddd').lineWidth(1);
        doc.fillColor(darkGray).fontSize(11).font('Helvetica');
        
        // Handle multiline messages
        const messageLines = messageData.message.split('\n');
        yPos += 15;
        messageLines.forEach(line => {
            doc.text(line, 65, yPos, { width: 482 });
            yPos += 18;
        });
        
        // Footer
        doc.rect(0, 750, 612, 42).fill(primaryBlue);
        doc.fillColor('white').fontSize(10).font('Helvetica');
        doc.text('© 2026 AKILES Hauling Services. All rights reserved.', 50, 765);
        doc.text('Cabuyao, Laguna, Philippines', 50, 780);
        
        doc.end();
        
        stream.on('finish', () => {
            console.log('PDF created:', filepath);
            resolve(filepath);
        });
        
        stream.on('error', reject);
    });
}

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

// Contact form submission
app.post('/api/v1/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
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
            error: 'Failed to process contact form'
        });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// ============================================
// VERCEL SERVERLESS FUNCTION EXPORT
// ============================================
module.exports = app;
