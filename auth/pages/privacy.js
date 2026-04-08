const styles = `
  .container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 700px;
    padding: 40px;
    line-height: 1.7;
    color: #333;
  }

  .container h1 {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .container .updated {
    color: #888;
    font-size: 13px;
    margin-bottom: 30px;
  }

  .container h2 {
    font-size: 18px;
    margin-top: 28px;
    margin-bottom: 12px;
    color: #222;
  }

  .container p {
    font-size: 15px;
    margin-bottom: 14px;
  }

  .container ul {
    padding-left: 24px;
    margin-bottom: 14px;
  }

  .container li {
    font-size: 15px;
    margin-bottom: 6px;
  }

  .container a {
    color: #667eea;
  }

  .back-link {
    display: inline-block;
    margin-top: 24px;
    color: #667eea;
    text-decoration: none;
    font-size: 14px;
  }

  .back-link:hover {
    text-decoration: underline;
  }
`;

export default function PrivacyPolicy() {
  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: April 8, 2026</p>

        <p>
          Sauna Control ("we", "our", "the skill") is an Alexa skill that lets
          you control your sauna by voice. This policy explains what data we
          collect, how we use it, and how we protect it.
        </p>

        <h2>What We Collect</h2>
        <p>
          When you link your account, we collect and store the following:
        </p>
        <ul>
          <li>
            Your email address and password for the Sauna Control service
            (used to authenticate you)
          </li>
          <li>
            Your sauna manufacturer login credentials (e.g., your Huum account
            email and password), which we need to send commands to your sauna
            on your behalf
          </li>
        </ul>
        <p>
          We do not collect your name, phone number, home address, payment
          information, or any data from your Alexa voice recordings.
        </p>

        <h2>How We Use Your Data</h2>
        <p>
          Your sauna manufacturer credentials are used for one purpose only: to
          communicate with your sauna manufacturer's API when you issue a voice
          command through Alexa. This is the same API that your manufacturer's
          own mobile app uses. We never use your credentials for any other
          purpose.
        </p>

        <h2>How We Protect Your Data</h2>
        <p>
          Your sauna manufacturer credentials are encrypted using AES-256-GCM
          encryption before being stored. They are only decrypted when needed
          to execute a command you've requested. All data is transmitted over
          HTTPS. Our database enforces row-level security so each user can only
          access their own records.
        </p>
        <p>
          To be transparent: because the skill needs to send your credentials
          to your sauna manufacturer's API on your behalf, our server must be
          able to decrypt them at runtime. This is the same model used by any
          service that acts on your behalf (such as smart home integrations and
          aggregator apps). We cannot offer "zero-knowledge" encryption for
          this use case.
        </p>

        <h2>Who Has Access</h2>
        <p>
          Your data is never shared with, sold to, or disclosed to any third
          party. The only external service that receives your sauna credentials
          is your sauna manufacturer's own API, which is where those credentials
          came from in the first place.
        </p>

        <h2>Data Retention and Deletion</h2>
        <p>
          Your data is stored as long as your account is active. If you unlink
          your account from Alexa or contact us to request deletion, we will
          permanently delete your stored credentials and account data.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can unlink your account at any time through the Alexa app, which
          will revoke the skill's access. To request full deletion of your
          stored data, contact us at the email below.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about this privacy policy or your data, contact
          us at:{' '}
          <a href="mailto:jgalebham@gmail.com">jgalebham@gmail.com</a>
        </p>

        <a href="/authorize" className="back-link">
          &larr; Back to Sauna Control
        </a>
      </div>
    </>
  );
}
