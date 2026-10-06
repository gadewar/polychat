import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: [{ type: mongoose.Schema.ObjectId, ref: "Users", required: true }],
  pendingMembers: [{ type: mongoose.Schema.ObjectId, ref: "Users" }],
  admin: { type: mongoose.Schema.ObjectId, ref: "Users", required: true },
  messages: [
    { type: mongoose.Schema.ObjectId, ref: "Messages", required: false },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

channelSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

channelSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Indexes for efficient channel retrieval and sorting
channelSchema.index({ admin: 1, updatedAt: -1 });
channelSchema.index({ members: 1, updatedAt: -1 });
channelSchema.index({ pendingMembers: 1, updatedAt: -1 });

const Channel = mongoose.model("Channels", channelSchema);
export default Channel;
