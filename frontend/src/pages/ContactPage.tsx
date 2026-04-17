import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";

import { FaGlobe, FaGithub } from "react-icons/fa";
import "../styles/Contact.css";

// Define the type for the form data
type FormData = {
  name: string;
  title: string;
  email: string;
  message: string;
};

const environment = import.meta.env;
emailjs.init({
  publicKey: environment.VITE_EMAILJS_PUBLIC_KEY || "",
  blockHeadless: true,
  limitRate: {
    id: "contact-form",
    throttle: 10000,
  },
});

const socialLinks = [
  {
    name: "Website",
    url: "https://styleo.vercel.app",
    icon: <FaGlobe />,
  },
  {
    name: "GitHub",
    url: "https://github.com/Sanjeev-Kumar78/StyleO",
    icon: <FaGithub />,
  },
];

const SocialButton = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="social-btn"
      aria-label={label}
      title={label}
    >
      {icon}
    </a>
  );
};

const ContactPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Function to handle form submission
  const submitHandler = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const form = formRef.current;
      if (!form) {
        throw new Error("Form reference is not set");
      }
      setIsSubmitting(true);
      setError(null);
      
      const formData = new FormData(form);
      const data: FormData = {
        name: formData.get("name") as string,
        title: formData.get("subject") as string,
        email: formData.get("email") as string,
        message: formData.get("message") as string,
      };

      if (!data.name || !data.email || !data.message) {
        setError("Please fill in all required fields.");
        setIsSubmitting(false);
        return;
      }

      if (data.name.length < 2) {
        setError("Name is too short. Please enter your full name.");
        setIsSubmitting(false);
        return;
      }

      if (data.message.length < 10) {
        setError("Please provide a more detailed message.");
        setIsSubmitting(false);
        return;
      }

      const response = await emailjs.sendForm(
        environment.VITE_EMAILJS_SERVICE_ID,
        environment.VITE_EMAILJS_TEMPLATE_ID,
        form,
        environment.VITE_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        setIsSubmitted(true);
        form.reset();
      }
    } catch (error) {
      setError("Failed to send message. Please try again later.");
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isSubmitted) {
        setIsSubmitted(false);
      }
      if (error) {
        setError(null);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isSubmitted, error]);

  return (
    <div className="contact-page-wrapper">
      <section className="contact-container" id="contact">
        <div className="contact-header">
          <h2 className="section-title">Get in Touch</h2>
          <p className="section-description">
            Have a question about StyleO, a feature request, or want to collaborate?
            We're always open to discussing new opportunities. Feel free to reach out!
          </p>
        </div>

        <div className="contact-card-container">
          <div className="contact-info-panel">
            <div className="contact-info-content">
              <h3>Contact Information</h3>
              <p>Fill up the form and we will get back to you within 24 hours.</p>



              <div className="social-links-area">
                <div className="social-buttons-grid">
                  {socialLinks.map((link) => (
                    <SocialButton
                      key={link.name}
                      href={link.url}
                      label={link.name}
                      icon={link.icon}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="circle-decor circle-1"></div>
            <div className="circle-decor circle-2"></div>
          </div>

          <div className="contact-form-panel">
            <div className="notification-area">
              {isSubmitted && (
                <div className="submission-message">
                  <p>Thank you for your message! We will get back to you soon.</p>
                </div>
              )}
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </div>

            <form ref={formRef} className="contact-form" onSubmit={submitHandler}>
              <div className="form-group row-group">
                <div className="input-container">
                  <label htmlFor="name">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    autoComplete="name"
                    required
                  />
                  <span className="focus-border"></span>
                </div>
                <div className="input-container">
                  <label htmlFor="email">Your Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="john@example.com"
                    autoComplete="email"
                    required
                  />
                  <span className="focus-border"></span>
                </div>
              </div>
              
              <div className="form-group">
                <div className="input-container">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="Feedback about StyleO"
                    autoComplete="off"
                  />
                  <span className="focus-border"></span>
                </div>
              </div>

              <div className="form-group">
                <div className="input-container">
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Write your message here..."
                    autoComplete="off"
                    required
                  ></textarea>
                  <span className="focus-border"></span>
                </div>
              </div>

              <div className="form-action">
                <button
                  type="submit"
                  className={`submit-button ${isSubmitting ? 'loading' : ''}`}
                  disabled={isSubmitting}
                >
                  <span className="btn-text">{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                  <span className="btn-hover-fx"></span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;