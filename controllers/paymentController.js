const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const User = require('../models/User');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { credits, amount } = req.body;
    const user = await User.findById(req.user.id);

    // Fallback to dummy payment if Stripe is not configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key') {
      const dummySessionId = `dummy_session_${Date.now()}`;
      return res.status(200).json({ 
        sessionId: dummySessionId, 
        url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/supporter/purchase-credit?session_id=${dummySessionId}&dummy_credits=${credits}&dummy_amount=${amount}` 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} FundFlow Credits`,
              description: 'Use credits to support campaigns on FundFlow',
            },
            unit_amount: amount * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/supporter/purchase-credit?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/supporter/purchase-credit`,
      client_reference_id: user._id.toString(),
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email,
        userName: user.name,
        credits: credits.toString()
      }
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { session_id, dummy_credits, dummy_amount } = req.body;
    
    if (!session_id) return res.status(400).json({ message: 'Session ID is required' });

    const user = await User.findById(req.user.id);

    // Handle Dummy Payment Verification
    if (session_id.startsWith('dummy_session_')) {
      const existingPayment = await Payment.findOne({ transaction_id: session_id });
      if (existingPayment) {
        return res.status(200).json({ success: true, message: 'Payment already processed' });
      }

      const credits = parseInt(dummy_credits);
      const payment = new Payment({
        user_email: user.email,
        user_name: user.name,
        credits: credits,
        amount: parseFloat(dummy_amount),
        transaction_id: session_id,
        status: 'succeeded',
        paidAt: new Date()
      });
      await payment.save();

      user.credits += credits;
      await user.save();

      return res.status(200).json({ success: true, message: 'Dummy Payment verified and credits added' });
    }

    // Standard Stripe Verification
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      const transactionId = session.payment_intent;
      
      const existingPayment = await Payment.findOne({ transaction_id: transactionId });
      if (existingPayment) {
        return res.status(200).json({ success: true, message: 'Payment already processed' });
      }

      const credits = parseInt(session.metadata.credits);
      
      const payment = new Payment({
        user_email: session.metadata.userEmail,
        user_name: session.metadata.userName,
        credits: credits,
        amount: session.amount_total / 100,
        transaction_id: transactionId,
        status: 'succeeded',
        paidAt: new Date()
      });
      await payment.save();

      await User.findByIdAndUpdate(session.metadata.userId, {
        $inc: { credits: credits }
      });

      res.status(200).json({ success: true, message: 'Payment verified and credits added' });
    } else {
      res.status(400).json({ success: false, message: 'Payment not successful' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const payments = await Payment.find({ user_email: user.email }).sort({ createdAt: -1 });
    res.status(200).json({ data: payments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
