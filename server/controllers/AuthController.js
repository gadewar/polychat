import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
// import { compare } from "bcrypt";
import { compare } from "bcryptjs";
const maxAge = 6 * 60 * 60 * 1000; // valid for 6 hours
import fs, { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import { userInfo } from "os";

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

export const signup = async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response.status(400).json({ message: "Email and Password are required." });
    }
    const user = await User.create({ email, password });
    response.cookie("jwt", createToken(email, user.id), {
      maxAge,
      secure: true,
      sameSite: "None",
    });
    return response.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
      },
    });
  } catch (error) {
    console.log(error);
    // MongoDB duplicate key error (email already exists)
    if (error.code === 11000) {
      return response.status(409).json({ message: "Email already exists. Please login instead." });
    }
    // Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return response.status(400).json({ message: messages.join(", ") });
    }
    return response.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};

export const login = async (request, response) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({ message: "Email and Password are required." });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return response.status(404).json({ message: "No account found with this email. Please sign up first." });
    }

    // Validate password
    const auth = await compare(password, user.password);
    if (!auth) {
      return response.status(400).json({ message: "Incorrect password. Please try again." });
    }

    // Generate JWT and set as a cookie
    response.cookie("jwt", createToken(email, user.id), {
      maxAge,
      secure: true,
      sameSite: "None",
    });

    return response.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        color: user.color,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return response.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};

export const getUserInfo = async (request, response, next) => {
  try {
    const userData = await User.findById(request.userId);
    if (!userData) {
      return response.status(404).json({ message: "User not found." });
    }
    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
      preferredLanguage: userData.preferredLanguage,
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const updateProfile = async (request, response) => {
  try {
    const { userId } = request;
    const { lastName, firstName, color, preferredLanguage } = request.body;
    if (!lastName || !firstName) {
      return response
        .status(400)
        .json({ message: "First name and last name are required." });
    }

    const userData = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        color,
        preferredLanguage,
        profileSetup: true,
      },
      { new: true, runValidators: true }
    ); //new tells mongodb to send new data to frontend

    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
      preferredLanguage: userData.preferredLanguage,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const addProfileImage = async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: "Image is required." });
    }
    const date = Date.now();
    let fileName =
      "uploads/profiles/" + date + path.extname(request.file.originalname);
    await fsPromises.rename(request.file.path, fileName);
    const updatedUser = await User.findByIdAndUpdate(
      request.userId,
      { image: fileName },
      { new: true, runValidators: true }
    );

    return response.status(200).json({
      image: updatedUser.image,
    });
  } catch (error) {
    console.error("Error adding profile image:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const removeProfileImage = async (request, response) => {
  try {
    const user = await User.findById(request.userId);
    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    if (user.image) {
      const filePath = path.join(process.cwd(), user.image);
      try {
        await fsPromises.unlink(filePath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn("File not found:", filePath);
        } else {
          throw err;
        }
      }
    }

    // Update the database to remove the image reference
    user.image = null;
    await user.save();

    return response.status(200).json({ message: "Image removed successfully." });
  } catch (error) {
    console.error("Error in removeProfileImage:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const logout = async (request, response) => {
  try {
    response.cookie("jwt", "", { maxAge: 1, secure: true, sameSite: "None" });

    return response.status(200).json({ message: "Logout successful." });
  } catch (error) {
    console.error("Error in logout:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};
