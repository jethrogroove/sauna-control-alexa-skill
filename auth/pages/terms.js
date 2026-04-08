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

export default function TermsOfService() {
  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: April 8, 2026</p>

        <p>
          By using Sauna Control ("the skill"), you agree to these terms. If you
          do not agree, please do not enable or use the skill.
        </p>

        <h2>What the Skill Does</h2>
        <p>
          Sauna Control lets you check the status of, start, and stop your sauna
          using Alexa voice commands. It communicates with your sauna
          manufacturer's API using the credentials you provide during account
          linking.
        </p>

        <h2>Your Responsibilities</h2>
        <p>
          You are responsible for ensuring that you have the right to use your
          sauna manufacturer account with third-party services. You should only
          link an account that belongs to you. You are responsible for keeping
          your Sauna Control account password secure.
        </p>

        <h2>Safety</h2>
        <p>
          A sauna is a high-temperature appliance. You are responsible for using
          your sauna safely, including verifying the physical state of your sauna
          before and during operation. Do not rely solely on voice commands or
          remote control to manage a sauna. Always follow your sauna
          manufacturer's safety guidelines.
        </p>

        <h2>Accuracy and Availability</h2>
        <p>
          The skill depends on your sauna manufacturer's API and on Amazon's
          Alexa service. We cannot guarantee uninterrupted availability or that
          status information is always up to date. If your manufacturer's API is
          down or changes, the skill may not function correctly.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          The skill is provided "as is" without warranties of any kind. We are
          not liable for any damages arising from the use of this skill,
          including but not limited to equipment damage, personal injury, or
          data loss. Use the skill at your own risk.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the
          skill after changes are posted constitutes acceptance of the updated
          terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Contact us at:{' '}
          <a href="mailto:jgalebham@gmail.com">jgalebham@gmail.com</a>
        </p>

        <a href="/authorize" className="back-link">
          &larr; Back to Sauna Control
        </a>
      </div>
    </>
  );
}
