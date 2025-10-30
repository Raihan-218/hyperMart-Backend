import { User } from '../db/users.models.js';
import bcrypt from 'bcrypt';

export const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // 1. Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 rounds is a good default

    // 4. Create the user in the database
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword
    });

    // 5. Send back the new user (remove password)
    const createdUser = await User.findById(user._id).select("-password");

    return res.status(201).json({
      message: "User registered successfully",
      user: createdUser
    });

  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
