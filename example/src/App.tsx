import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import "./App.css";

export default function App() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(5000);
  const [txRef, setTxRef] = useState<string | null>(null);

  const initializeTransaction = useAction(api.example.initializeTransaction);
  const transaction = useQuery(
    api.example.getTransaction,
    txRef ? { txRef } : "skip",
  );
  const hasActiveSubscription = useQuery(
    api.example.hasActiveSubscription,
    email ? { customerEmail: email } : "skip",
  );

  async function pay() {
    const result = await initializeTransaction({
      email,
      amount,
      redirectUrl: window.location.href,
    });
    setTxRef(result.txRef);
    window.location.href = result.paymentLink;
  }

  return (
    <main className="app">
      <h1>convex-flutterwave</h1>
      <p>Accept payments and subscriptions with Flutterwave in your Convex app.</p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label>
        Amount (NGN)
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </label>

      <button onClick={pay} disabled={!email || amount <= 0}>
        Pay with Flutterwave
      </button>

      {transaction && (
        <p>
          Transaction <code>{transaction.txRef}</code> is{" "}
          <strong>{transaction.status}</strong>.
        </p>
      )}

      {email && (
        <p>
          Active subscription: <strong>{String(hasActiveSubscription)}</strong>
        </p>
      )}
    </main>
  );
}
