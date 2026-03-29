// EmailJS Configuration
// Set these via environment variables or replace the defaults below
// Get credentials from: https://dashboard.emailjs.com/

export const EMAILJS_CONFIG = {
  // Your public key from EmailJS dashboard
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY_HERE',

  // Your service ID (email service you connected)
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID_HERE',

  // Your template ID (the template you created)
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID_HERE'
};

/*
TO SET UP:
1. Go to your EmailJS dashboard: https://dashboard.emailjs.com/
2. Copy your Public Key from Integration tab
3. Copy your Service ID from Email Services tab
4. Copy your Template ID from Email Templates tab
5. Set them as environment variables:
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id

TEMPLATE SETUP:
Create a template with these variables:
- {{from_name}} - Sender's name
- {{from_email}} - Sender's email
- {{subject}} - Message subject
- {{message}} - Message content
- {{to_name}} - Your name (recipient)
*/
