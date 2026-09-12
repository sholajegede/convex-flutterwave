export function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner__inner">
        <span className="top-banner__badge">
          <span aria-hidden="true">🧪</span> Test mode
        </span>
        <span className="top-banner__text">No real money moves. Use</span>
        <code className="top-banner__code">5531 8866 5214 2950</code>
        <span className="top-banner__text">
          (expiry 09/32, CVV 564, PIN 3310, OTP 12345) for an instant success, or
        </span>
        <code className="top-banner__code">5143 0105 2233 9965</code>
        <span className="top-banner__text">to see a decline and the retry flow.</span>
      </div>
    </div>
  );
}
