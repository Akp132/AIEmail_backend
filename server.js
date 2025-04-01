require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

console.log("🚀 [SERVER.JS] Server file loaded!");

/**
 * Ping route for testing frontend-backend connectivity
 */
app.get('/api/ping', (req, res) => {
  console.log('[PING] Pinged from frontend!');
  res.json({ status: 'OK' });
});

/**
 * Generate email content using OpenRouter (Mistral model)
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('\n[GENERATE] Received POST to /api/generate');
    console.log('[GENERATE] Prompt:', prompt);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    console.log('[DEBUG] Using API Key:', process.env.OPENROUTER_API_KEY?.slice(0, 10) + '...');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // ✅ Valid public model
        messages: [
          {
            role: 'user',
            content: `Write a professional email with this context: ${prompt}`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[GENERATE] OpenRouter responded:', JSON.stringify(response.data, null, 2));

    const generatedEmail = response.data?.choices?.[0]?.message?.content;

    if (!generatedEmail) {
      return res.status(500).json({ error: 'No email content generated.' });
    }

    res.json({ emailContent: generatedEmail });

  } catch (error) {
    console.error('[GENERATE] Error occurred:');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }

    res.status(500).json({ error: 'Failed to generate email content.' });
  }
});

/**
 * Send email using Nodemailer and Gmail App Password
 */
app.post('/api/send', async (req, res) => {
  try {
    const { recipients, subject, emailBody } = req.body;

    if (!recipients || !emailBody) {
      return res.status(400).json({ error: 'Recipients and email body are required.' });
    }

    console.log('\n[SEND] Sending email to:', recipients);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: recipients,
      subject: subject || 'AI-Generated Email',
      text: emailBody
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[SEND] Email sent:', info.messageId);
    res.json({ success: true, info });

  } catch (error) {
    console.error('[SEND] Email sending error:', error.message);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
