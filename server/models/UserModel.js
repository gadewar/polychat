import mongoose from "mongoose";
// import bcrypt, { genSalt, hash } from "bcrypt";
import { genSalt, hash } from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required."],
  },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  color: {
    type: Number,
    required: false,
  },
  preferredLanguage: {
    type: String,
    required: false,
    default: "en", // Default to English
  },
  profileSetup: {
    //once logged in then only give access of app
    type: Boolean,
    default: false,
  },
  friends: [
    { type: mongoose.Schema.ObjectId, ref: "Users" }
  ],
  friendRequests: [
    { type: mongoose.Schema.ObjectId, ref: "Users" }
  ],
  sentFriendRequests: [
    { type: mongoose.Schema.ObjectId, ref: "Users" }
  ],
});

userSchema.pre("save", async function (next) {
  ///.pre is a type of middleware provide by mongoose and 
  //do not use arrow function because we need to access data through (this) keyword
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await genSalt();
  this.password = await hash(this.password, salt);
  next();
});
// Indexes to optimize regex search queries (Index Scan instead of COLLSCAN)
userSchema.index({ firstName: 1 });
userSchema.index({ lastName: 1 });

const User = mongoose.model("Users", userSchema);
export default User;
