const mongoose = require('mongoose');
require('dotenv').config();
const Campaign = require('./models/Campaign');
const User = require('./models/User');

const seedCampaigns = [
  {
    title: "Build a Solar-Powered Water Pump",
    category: "Technology",
    image: "/images/campaign-tech.jpg",
    description: "Bringing sustainable and clean water access to remote villages using advanced solar technology.",
    raisedAmount: 8450,
    targetAmount: 12000,
    status: 'approved',
  },
  {
    title: "Urban Community Garden Project",
    category: "Environment",
    image: "/images/campaign-env.jpg",
    description: "Transforming empty city lots into vibrant green spaces for growing organic food and fostering community.",
    raisedAmount: 15200,
    targetAmount: 20000,
    status: 'approved',
  },
  {
    title: "Interactive City Plaza Art Installation",
    category: "Art",
    image: "/images/campaign-art.jpg",
    description: "A breathtaking interactive light and sound sculpture designed to bring creativity to the public square.",
    raisedAmount: 4200,
    targetAmount: 5000,
    status: 'approved',
  },
  {
    title: "Mobile Health Clinic Van",
    category: "Health",
    image: "/images/campaign-health.jpg",
    description: "Providing essential medical care and health checkups to underserved rural communities.",
    raisedAmount: 25000,
    targetAmount: 40000,
    status: 'approved',
  },
  {
    title: "Next-Gen Tablets for Rural Classrooms",
    category: "Education",
    image: "/images/campaign-edu.jpg",
    description: "Empowering young students with modern educational technology and digital literacy programs.",
    raisedAmount: 9800,
    targetAmount: 10000,
    status: 'approved',
  },
  {
    title: "VR Headsets for Architectural Design",
    category: "Technology",
    image: "/images/campaign-vr.jpg",
    description: "Creating accessible virtual reality tools to help independent architects visualize their creations.",
    raisedAmount: 3150,
    targetAmount: 7000,
    status: 'approved',
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database');

    // Create a dummy creator user if none exists
    let dummyCreator = await User.findOne({ email: 'creator@example.com' });
    if (!dummyCreator) {
      dummyCreator = await User.create({
        name: 'Demo Creator',
        email: 'creator@example.com',
        password: 'password123', // Just a hash placeholder, we won't log in
        role: 'creator'
      });
      console.log('Created dummy creator');
    }

    // Clear existing campaigns to avoid duplicates
    await Campaign.deleteMany({});
    
    // Add creator ID and deadline to seed data
    const campaignsToInsert = seedCampaigns.map(c => ({
      ...c,
      creator: dummyCreator._id,
      creatorName: dummyCreator.name,
      creatorEmail: dummyCreator.email,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }));

    // Generate 15 extra pending dummy campaigns
    for (let i = 1; i <= 15; i++) {
      campaignsToInsert.push({
        title: `Dummy Pending Campaign ${i}`,
        category: ["Technology", "Health", "Art", "Education", "Environment"][i % 5],
        image: `/images/campaign-${["tech", "health", "art", "edu", "env"][i % 5]}.jpg`,
        description: `This is a randomly generated pending campaign for testing the approval dashboard. Number ${i}.`,
        raisedAmount: 0,
        targetAmount: 5000 + (i * 1000),
        status: 'pending',
        creator: dummyCreator._id,
        creatorName: dummyCreator.name,
        creatorEmail: dummyCreator.email,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    await Campaign.insertMany(campaignsToInsert);
    console.log('Successfully seeded campaigns into database! Included 15 pending campaigns.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
