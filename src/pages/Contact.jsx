import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { EMAILJS_CONFIG } from '../config/email'

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      // Check if EmailJS is configured
      if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY_HERE') {
        throw new Error('EmailJS not configured. Please add your credentials to src/config/email.js')
      }

      // Initialize EmailJS
      emailjs.init(EMAILJS_CONFIG.publicKey)

      // Prepare template parameters
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_name: import.meta.env.VITE_ARTIST_DISPLAY_NAME || 'Artist'
      }

      // Send email
      const result = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams
      )

      console.log('Email sent successfully:', result.text)
      
      // Success
      setSubmitMessage('🎨 Message sent to the madman! Expect a response when the moon is full...')
      setFormData({ name: '', email: '', subject: '', message: '' })

    } catch (error) {
      console.error('Email send failed:', error)
      
      // Error handling
      if (error.message.includes('not configured')) {
        setSubmitMessage('⚠️ Email system not configured yet. Please contact the artist directly.')
      } else if (error.text) {
        setSubmitMessage(`💀 Message failed to send: ${error.text}`)
      } else {
        setSubmitMessage('💀 Message failed to send. The digital demons are interfering! Try again later.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl text-comic text-ink mb-4 transform rotate-2">
          Contact the Madman
        </h1>
        <p className="text-xl text-newsprint text-faded-blue max-w-2xl mx-auto">
          Ready to commission your own slice of chaos? Need to report a supernatural incident? 
          Or just want to tell the artist how wonderfully disturbing their work is? Drop a line!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="comic-card bg-aged-paper">
          <h2 className="text-3xl text-comic text-ink mb-6 transform -rotate-1">
            Send a Message to the Void
          </h2>
          
          {submitMessage && (
            <div className={`border-2 border-ink p-4 mb-6 transform rotate-1 ${
              submitMessage.includes('⚠️') || submitMessage.includes('💀') 
                ? 'bg-dusty-red text-paper' 
                : 'bg-slime-green text-ink'
            }`}>
              <p className="text-comic">{submitMessage}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-newsprint text-ink font-bold mb-2">
                Your Name (or Alias)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-ink bg-paper font-newsprint text-ink focus:bg-slime-green focus:outline-none transition-colors"
                placeholder="Dr. Chaos, Anonymous Admirer, etc."
              />
            </div>
            
            <div>
              <label className="block text-newsprint text-ink font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-ink bg-paper font-newsprint text-ink focus:bg-slime-green focus:outline-none transition-colors"
                placeholder="yourname@asylum.com"
              />
            </div>
            
            <div>
              <label className="block text-newsprint text-ink font-bold mb-2">
                Subject
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-ink bg-paper font-newsprint text-ink focus:bg-slime-green focus:outline-none transition-colors"
              >
                <option value="">Choose your poison...</option>
                <option value="commission">Commission Request</option>
                <option value="purchase">Purchase Existing Work</option>
                <option value="collaboration">Collaboration Proposal</option>
                <option value="fan-mail">Fan Mail</option>
                <option value="complaint">Complaint Department</option>
                <option value="existential-crisis">Existential Crisis</option>
                <option value="other">Other Weirdness</option>
              </select>
            </div>
            
            <div>
              <label className="block text-newsprint text-ink font-bold mb-2">
                Your Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
                className="w-full p-3 border-2 border-ink bg-paper font-newsprint text-ink focus:bg-slime-green focus:outline-none transition-colors resize-none"
                placeholder="Spill your thoughts into the digital abyss..."
              ></textarea>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-comic text-xl px-6 py-4 border-4 border-ink shadow-comic transition-all duration-150 ${
                isSubmitting 
                  ? 'bg-dusty-red text-paper cursor-not-allowed'
                  : 'bg-toxic-orange text-ink hover:bg-slime-green hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
              }`}
            >
              {isSubmitting ? 'Transmitting to the Void...' : 'Send Message!'}
            </button>
          </form>
        </div>

        {/* Contact Info & Fun Stuff */}
        <div className="space-y-6">
          {/* Contact Details */}
          <div className="comic-card bg-murky-green text-paper">
            <h3 className="text-2xl text-comic mb-4">
              Alternative Contact Methods
            </h3>
            <div className="space-y-3 text-newsprint">
              <p>📧 Email: your-email@your-domain.com</p>
              <p>📱 Phone: 1-800-MAD-ART</p>
              <p>🏠 Studio: The Abandoned Warehouse District</p>
              <p>⏰ Hours: Whenever madness strikes (usually 3 AM)</p>
            </div>
          </div>

          {/* Commission Info */}
          <div className="comic-card bg-dusty-red text-paper transform -rotate-2">
            <h3 className="text-2xl text-comic mb-4">
              Commission Guidelines
            </h3>
            <ul className="space-y-2 text-newsprint list-disc list-inside">
              <li>Custom pieces start at $666</li>
              <li>Turnaround time: 2-4 weeks</li>
              <li>I don't do "normal" art</li>
              <li>Weird requests encouraged</li>
              <li>Payment in cash, crypto, or souls</li>
              <li>No refunds (art is permanent)</li>
            </ul>
          </div>

          {/* Warning Notice */}
          <div className="comic-card bg-deep-magenta text-paper transform rotate-1">
            <h3 className="text-2xl text-comic mb-4">
              ⚠️ Warning Notice ⚠️
            </h3>
            <p className="text-newsprint">
              Viewing this artwork may cause: existential dread, uncontrollable laughter, 
              nightmares, epiphanies, or sudden urges to create your own weird art. 
              The management is not responsible for any psychological side effects.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact