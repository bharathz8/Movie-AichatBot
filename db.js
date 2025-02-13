import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB Connected");
      return;
    } catch (err) {
      console.error(`❌ MongoDB Connection Attempt ${i + 1} Failed:`, err);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
    }
  }
};

export default connectDB;
