import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    requried: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    requried: false,
  },
  messageType: {
    type: String,
    enum: ["text", "file"],
    required: true,
  },
  content: {
    type: String,
    required: function () {
      return this.messageType === "text";
    },
  },
  originalContent: {
    type: String,
    required: false,
  },
  translatedContent: {
    type: Map,
    of: String,
    default: new Map(),
    required: false,
  },
  languageFrom: {
    type: String,
    required: false,
  },
  fileUrl: {
    type: String,
    required: function () {
      return this.messageType === "file";
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  messageStatus: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
});

// Compound indexes for fast message retrieval and sorting
messageSchema.index({ sender: 1, recipient: 1, timestamp: 1 });
messageSchema.index({ recipient: 1, sender: 1, timestamp: 1 });

const Message = mongoose.model("Messages", messageSchema);

export default Message;
