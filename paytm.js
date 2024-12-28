const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Rate limiting
const requestLimiter = rateLimit({
    windowMs: 900000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
});
app.use(requestLimiter);

// MongoDB connection
mongoose
    .connect('mongodb+srv://shiva5078457:jS8RDmv6ChV7cJzU@cluster0.jymkq.mongodb.net/')
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Schemas and models
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    emailAddress: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    upi: { type: String, unique: true },
    accountBalance: { type: Number, default: 125000 },
});

const transactionSchema = new mongoose.Schema({
    fromUPI: { type: String, required: true },
    toUPI: { type: String, required: true },
    transactionAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('AccountHolder', userSchema);
const Transaction = mongoose.model('TransactionRecord', transactionSchema);

// Helper function to create unique UPI
const createUniqueUPI = async () => {
    let isUnique = false;
    let generatedUPI;

    while (!isUnique) {
        generatedUPI = `${crypto.randomBytes(4).toString('hex')}@payfast`;
        const existingUser = await User.findOne({ upi: generatedUPI });
        if (!existingUser) isUnique = true;
    }
    return generatedUPI;
};

// Registration endpoint
app.post('/api/register', async (req, res) => {
    const validationSchema = Joi.object({
        fullName: Joi.string().min(3).required(),
        emailAddress: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    });

    const { error } = validationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const { fullName, emailAddress, password } = req.body;

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const newUPI = await createUniqueUPI();

        const newUser = new User({
            fullName,
            emailAddress,
            hashedPassword: passwordHash,
            upi: newUPI,
        });
        await newUser.save();

        res.status(201).json({ message: 'Registration successful!', upi: newUPI });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/signin', async (req, res) => {
    const validationSchema = Joi.object({
        emailAddress: Joi.string().email().required(),
        password: Joi.string().required(),
    });

    const { error } = validationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const { emailAddress, password } = req.body;

        const existingUser = await User.findOne({ emailAddress });
        if (!existingUser) return res.status(400).json({ message: 'Invalid credentials' });

        const passwordMatches = await bcrypt.compare(password, existingUser.hashedPassword);
        if (!passwordMatches) return res.status(400).json({ message: 'Invalid credentials' });

        res.status(200).json({
            message: 'Login successful',
            fullName: existingUser.fullName,
            emailAddress: existingUser.emailAddress,
            upi: existingUser.upi,
            balance: existingUser.accountBalance,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Transaction endpoint
app.post('/api/make-payment', async (req, res) => {
    const validationSchema = Joi.object({
        fromUPI: Joi.string().required(),
        toUPI: Joi.string().required(),
        transactionAmount: Joi.number().positive().required(),
    });

    const { error } = validationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const { fromUPI, toUPI, transactionAmount } = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const sender = await User.findOne({ upi: fromUPI }).session(session);
            const receiver = await User.findOne({ upi: toUPI }).session(session);

            if (!sender) throw new Error('Sender not found');
            if (!receiver) throw new Error('Receiver not found');
            if (sender.accountBalance < transactionAmount) throw new Error('Insufficient funds');

            sender.accountBalance -= transactionAmount;
            receiver.accountBalance += transactionAmount;

            await sender.save({ session });
            await receiver.save({ session });

            const paymentRecord = new Transaction({
                fromUPI,
                toUPI,
                transactionAmount,
            });
            await paymentRecord.save({ session });

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({ message: 'Transaction completed successfully' });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    } catch (err) {
        console.error('Transaction error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Transaction history endpoint
app.get('/api/transaction-history/:upi', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const userUPI = req.params.upi;

    try {
        const transactionHistory = await Transaction.find({
            $or: [{ fromUPI: userUPI }, { toUPI: userUPI }],
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        const transactionsWithUserDetails = await Promise.all(
            transactionHistory.map(async (transaction) => {
                const sender = await User.findOne({ upi: transaction.fromUPI });
                const receiver = await User.findOne({ upi: transaction.toUPI });

                return {
                    ...transaction,
                    senderName: sender?.fullName || 'Unknown',
                    senderEmail: sender?.emailAddress || 'Unknown',
                    receiverName: receiver?.fullName || 'Unknown',
                    receiverEmail: receiver?.emailAddress || 'Unknown',
                };
            })
        );

        res.status(200).json(transactionsWithUserDetails);
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User details endpoint
app.get('/api/user-details/:upi', async (req, res) => {
    try {
        const { upi } = req.params;
        const userInfo = await User.findOne({ upi }).select('-hashedPassword');

        if (!userInfo) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(userInfo);
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start the server
const SERVER_PORT = process.env.PORT || 5000;
app.listen(SERVER_PORT, () => console.log(`Server is running on port ${SERVER_PORT}`));
