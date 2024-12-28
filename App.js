import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api',
});

const commonStyle = {
  display: 'flex',
  minHeight: '100vh',
};

const leftPanelStyle = {
  flex: 1,
  backgroundColor: '#f0f0f0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const rightPanelStyle = {
  flex: 1,
  backgroundColor: 'white',
  padding: '40px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={commonStyle}>
      <div style={leftPanelStyle}>
        <img src="https://i.postimg.cc/N0HtKhV3/Gemini-Generated-Image-4mamxy4mamxy4mam.jpg" alt="Home" style={{ maxWidth: '100%', maxHeight: '80%' }} />
      </div>
      <div style={rightPanelStyle}>
        <h1>Welcome to Vethan Wallet</h1>
        <p>Vethan: The Indigenous Digital Payment Wallet</p>
        <p>Smart, Fast, and Secure – The Vethan Way!</p>
        <button onClick={() => navigate('/signup')}>Sign Up</button>
        <button onClick={() => navigate('/login')}>Login</button>
      </div>
    </div>
  );
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await instance.post('/register', { fullName, emailAddress, password });
      alert(response.data.message);
      navigate('/login');
    } catch (error) {
      alert(error.response?.data?.message || 'Error during sign-up');
    }
  };

  return (
    <div style={commonStyle}>
      <div style={leftPanelStyle}>
        <img src="https://i.postimg.cc/NMgYDRtg/Gemini-Generated-Image-41e3bq41e3bq41e3-1.jpg" alt="Sign Up" style={{ maxWidth: '100%', maxHeight: '80%' }} />
      </div>
      <div style={rightPanelStyle}>
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign Up</button>
        </form>
        {/* Back to Home button */}
        <button onClick={() => navigate('/')}>Back to Home Page</button>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await instance.post('/signin', { emailAddress, password });
      localStorage.setItem('userUPI', response.data.upi);
      localStorage.setItem('userBalance', response.data.balance);
      localStorage.setItem('userName', response.data.fullName);
      localStorage.setItem('userEmail', response.data.emailAddress);
      navigate('/transaction');
    } catch (error) {
      alert(error.response?.data?.message || 'Error during login');
    }
  };

  return (
    <div style={commonStyle}>
      <div style={leftPanelStyle}>
        <img src="https://i.postimg.cc/5tRs0Vt8/LP-final.png" alt="Login" style={{ maxWidth: '100%', maxHeight: '80%' }} />
      </div>
      <div style={rightPanelStyle}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email Address"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        {/* Back to Home button */}
        <button onClick={() => navigate('/')}>Back to Home Page</button>
      </div>
    </div>
  );
};

const TransactionPage = () => {
  const navigate = useNavigate();
  const [upi, setUpi] = useState(localStorage.getItem('userUPI'));
  const [balance, setBalance] = useState(localStorage.getItem('userBalance'));
  const [name, setName] = useState(localStorage.getItem('userName'));
  const [email, setEmail] = useState(localStorage.getItem('userEmail'));
  const [transactionAmount, setTransactionAmount] = useState('');
  const [receiverUPI, setReceiverUPI] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);

  const handleSendMoney = async (e) => {
    e.preventDefault();

    try {
      const response = await instance.post('/make-payment', {
        fromUPI: upi,
        toUPI: receiverUPI,
        transactionAmount,
      });

      setBalance((prevBalance) => prevBalance - transactionAmount);
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.message || 'Error during transaction');
    }
  };

  const handleFetchHistory = async () => {
    try {
      const response = await instance.get(`/transaction-history/${upi}`);
      setTransactionHistory(response.data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error fetching transaction history');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={commonStyle}>
      <div style={leftPanelStyle}>
        <img src="https://i.postimg.cc/wjVL4nbK/transac.png" alt="Transaction" style={{ maxWidth: '100%', maxHeight: '80%' }} />
      </div>
      <div style={rightPanelStyle}>
        <h2>Transaction Page</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>UPI ID:</strong> {upi}</p>
        <p><strong>Balance:</strong> {balance}</p>

        <form onSubmit={handleSendMoney}>
          <input
            type="text"
            placeholder="Recipient UPI"
            value={receiverUPI}
            onChange={(e) => setReceiverUPI(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={transactionAmount}
            onChange={(e) => setTransactionAmount(e.target.value)}
            required
          />
          <button type="submit">Send Money</button>
        </form>

        <button onClick={handleFetchHistory}>Transaction History</button>
        {transactionHistory.length > 0 && (
          <div>
            <h3>Transaction History</h3>
            <ul>
              {transactionHistory.map((txn, index) => (
                <li key={index}>
                  <p>From: {txn.senderName} ({txn.fromUPI})</p>
                  <p>To: {txn.receiverName} ({txn.toUPI})</p>
                  <p>Amount: {txn.transactionAmount}</p>
                  <p>Date: {new Date(txn.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/transaction" element={<TransactionPage />} />
      </Routes>
    </Router>
  );
};

export default App;
