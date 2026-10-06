import { Server as SocketIoServer } from "socket.io";
import Message from "./models/MessagesModel.js";
import Channel from "./models/ChannelModel.js";
import User from "./models/UserModel.js";
import {
  translateText,
  detectLanguage,
  shouldForceTranslate,
} from "./services/translationService.js";

const setupSocket = (server) => {
  // For deployment: Allow multiple origins
  const allowedOrigins = process.env.ORIGIN 
    ? process.env.ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

  const io = new SocketIoServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const userSocketMap = new Map();

  // === ONLINE STATUS ===
  const broadcastOnlineStatus = (userId, isOnline) => {
    io.emit("user-status-change", { userId, isOnline });
  };

  const getOnlineUsers = () => {
    return Array.from(userSocketMap.keys());
  };

  const disconnect = (socket) => {
    console.log(`Client Disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        broadcastOnlineStatus(userId, false);
        console.log(`User ${userId} went offline`);
        break;
      }
    }
  };

  // === DM MESSAGES ===
  const sendMessage = async (message) => {
    try {
      console.log(
        `Processing message: ${JSON.stringify(message, (key, value) => {
          if (key === "content" && typeof value === "string" && value.length > 50) {
            return value.substring(0, 50) + "...";
          }
          return value;
        })}`
      );

      const senderSocketId = userSocketMap.get(message.sender);
      const recipientSocketId = userSocketMap.get(message.recipient);

      const senderUser = await User.findById(message.sender);
      const recipientUser = await User.findById(message.recipient);

      if (message.messageType === "text") {
        message.originalContent = message.content;
        if (!message.translatedContent) {
          message.translatedContent = {};
        }
      }

      const createdMessage = await Message.create(message);

      let messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color preferredLanguage")
        .populate("recipient", "id email firstName lastName image color preferredLanguage");

      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
      }

      if (message.messageType !== "text" && recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
      }

      if (message.messageType === "text") {
        setTimeout(() => {
          (async () => {
            try {
              console.log(`Starting async translation for message: ${createdMessage._id}`);

              if (!senderUser || !recipientUser) {
                console.log("Skipping translation due to missing user data");
                return;
              }

              let detectedLanguage;
              try {
                detectedLanguage = await detectLanguage(
                  message.content,
                  senderUser?.preferredLanguage || "en"
                );
                console.log(`Detected language: ${detectedLanguage} for message: ${createdMessage._id}`);
                await Message.findByIdAndUpdate(createdMessage._id, {
                  languageFrom: detectedLanguage,
                  originalContent: message.content,
                });
              } catch (langError) {
                console.error("Language detection error:", langError);
                detectedLanguage = senderUser?.preferredLanguage || "en";
              }

              const looksLikeHinglish =
                /^(?=.*\b(?:main|tum|kya|kese|nahi|hai|ho|ka|ke|ki)\b)[a-zA-Z\s.,!?']{4,}$/i.test(message.content);
              const containsDevanagari = /[\u0900-\u097F]/.test(message.content);

              if (detectedLanguage === "en" && senderUser?.preferredLanguage === "hi" && looksLikeHinglish) {
                console.log("Detected as English, but assuming Hinglish (Hindi in Roman script)");
                detectedLanguage = "hi";
              }

              let shouldTranslate = false;
              if (recipientUser?.preferredLanguage) {
                if (recipientUser.preferredLanguage !== detectedLanguage) {
                  shouldTranslate = true;
                } else if (recipientUser.preferredLanguage === "hi" && detectedLanguage === "hi") {
                  if (!containsDevanagari || looksLikeHinglish) {
                    shouldTranslate = true;
                    console.log("Forcing translation: Hinglish to Hindi");
                  }
                }
              }

              let finalText = message.content;

              if (shouldTranslate) {
                try {
                  console.log(`Translating from ${detectedLanguage} to ${recipientUser.preferredLanguage}`);
                  const forceTranslate = shouldForceTranslate(detectedLanguage, recipientUser.preferredLanguage, message.content);
                  const translatedText = await translateText(message.content, detectedLanguage, recipientUser.preferredLanguage, forceTranslate);
                  console.log("Translation successful:", translatedText);

                  await Message.findByIdAndUpdate(createdMessage._id, {
                    $set: {
                      [`translatedContent.${recipientUser.preferredLanguage}`]: translatedText,
                      originalContent: message.content,
                      languageFrom: detectedLanguage,
                    },
                  });
                  finalText = translatedText;
                } catch (translationError) {
                  console.error("Translation error:", translationError);
                  finalText = `${message.content} [Translation failed]`;
                }
              }

              if (recipientSocketId) {
                try {
                  const translatedMessageData = {
                    _id: messageData._id.toString(),
                    sender: {
                      _id: messageData.sender._id.toString(),
                      firstName: messageData.sender.firstName || "",
                      lastName: messageData.sender.lastName || "",
                      image: messageData.sender.image || null,
                      color: messageData.sender.color || "blue",
                    },
                    recipient: {
                      _id: messageData.recipient._id.toString(),
                      firstName: messageData.recipient.firstName || "",
                      lastName: messageData.recipient.lastName || "",
                    },
                    content: finalText,
                    createdAt: messageData.createdAt,
                    messageType: messageData.messageType,
                    fileUrl: messageData.fileUrl || null,
                    isTranslated: shouldTranslate,
                  };
                  io.to(recipientSocketId).emit("receiveMessage", translatedMessageData);
                  console.log(`Message sent to recipient: ${recipientSocketId}`);
                } catch (socketError) {
                  console.error("Error sending message to recipient:", socketError);
                }
              }
            } catch (error) {
              console.error("Async translation error:", error);
            }
          })();
        }, 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // === CHANNEL MESSAGES ===
  const sendChannelMessage = async (message) => {
    try {
      const { channelId, sender, content, messageType, fileUrl } = message;
      const senderUser = await User.findById(sender);

      const messageObj = {
        sender,
        recipient: null,
        content,
        messageType,
        timestamp: new Date(),
        fileUrl,
      };

      if (messageType === "text") {
        messageObj.originalContent = content;
        messageObj.translatedContent = {};
      }

      const createdMessage = await Message.create(messageObj);

      const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color preferredLanguage")
        .exec();

      await Channel.findByIdAndUpdate(channelId, {
        $push: { messages: createdMessage._id },
      });

      const channel = await Channel.findById(channelId).populate("members");
      const admin = await User.findById(channel.admin);
      const baseData = { ...messageData._doc, channelId: channel._id };

      if (channel && channel.members) {
        const senderSocketId = userSocketMap.get(sender);
        if (senderSocketId) {
          io.to(senderSocketId).emit(`receive-channel-message`, baseData);
        }

        if (messageType !== "text") {
          channel.members.forEach((member) => {
            const memberSocketId = userSocketMap.get(member._id.toString());
            if (memberSocketId && member._id.toString() !== sender) {
              io.to(memberSocketId).emit(`receive-channel-message`, baseData);
            }
          });
          return;
        }

        setTimeout(async () => {
          try {
            if (!senderUser) return;

            let detectedLanguage = await detectLanguage(content, senderUser?.preferredLanguage || "en");

            const looksLikeHinglish = /\b(?:main|tum|kya|kese|nahi|hai|ho|ka|ke|ki|aap|yeh|woh|kuch|acha)\b/i.test(content);
            const containsDevanagari = /[\u0900-\u097F]/.test(content);
            const containsLatin = /[a-zA-Z]/.test(content);

            if (
              (detectedLanguage === "en" && senderUser?.preferredLanguage === "hi" && looksLikeHinglish) ||
              (detectedLanguage === "hi" && !containsDevanagari && containsLatin)
            ) {
              console.log("Detected Hinglish (Hindi in Latin script), setting language to Hindi");
              detectedLanguage = "hi";
            }

            await Message.findByIdAndUpdate(createdMessage._id, { languageFrom: detectedLanguage });

            const targetLanguages = new Set();
            const membersToTranslate = [];

            channel.members.forEach((member) => {
              if (member._id.toString() !== sender) {
                targetLanguages.add(member.preferredLanguage);
                membersToTranslate.push(member);
              }
            });

            const translations = {};
            for (const lang of targetLanguages) {
              const forceTranslate = shouldForceTranslate(detectedLanguage, lang, content);
              const needsTranslation = lang !== detectedLanguage || forceTranslate;

              if (needsTranslation) {
                try {
                  const translatedText = await translateText(content, detectedLanguage, lang, forceTranslate);
                  translations[lang] = translatedText;
                  await Message.findByIdAndUpdate(createdMessage._id, {
                    $set: {
                      [`translatedContent.${lang}`]: translatedText,
                      originalContent: content,
                      languageFrom: detectedLanguage,
                    },
                  });
                } catch (error) {
                  console.error(`Translation to ${lang} failed:`, error);
                  translations[lang] = content;
                }
              } else {
                translations[lang] = content;
              }
            }

            membersToTranslate.forEach((member) => {
              const socketId = userSocketMap.get(member._id.toString());
              if (socketId) {
                const translatedData = {
                  ...baseData,
                  content: translations[member.preferredLanguage] || content,
                  isTranslated: translations[member.preferredLanguage] !== content,
                };
                io.to(socketId).emit(`receive-channel-message`, translatedData);
              }
            });
          } catch (error) {
            console.error("Channel translation error:", error);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error sending channel message:", error);
    }
  };

  // === TYPING INDICATORS ===
  const handleTyping = (socket, data) => {
    const { recipientId } = data;
    const recipientSocketId = userSocketMap.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", { senderId: socket.userId });
    }
  };

  const handleStopTyping = (socket, data) => {
    const { recipientId } = data;
    const recipientSocketId = userSocketMap.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-stop-typing", { senderId: socket.userId });
    }
  };

  const handleChannelTyping = async (socket, data) => {
    try {
      const { channelId } = data;
      const channel = await Channel.findById(channelId).populate("members");
      if (!channel) return;

      const senderUser = await User.findById(socket.userId);
      const senderName = senderUser
        ? `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim()
        : "Someone";

      channel.members.forEach((member) => {
        if (member._id.toString() !== socket.userId) {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("channel-user-typing", { channelId, senderId: socket.userId, senderName });
          }
        }
      });
    } catch (error) {
      console.error("Error in handleChannelTyping:", error);
    }
  };

  const handleChannelStopTyping = async (socket, data) => {
    try {
      const { channelId } = data;
      const channel = await Channel.findById(channelId).populate("members");
      if (!channel) return;

      channel.members.forEach((member) => {
        if (member._id.toString() !== socket.userId) {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("channel-user-stop-typing", { channelId, senderId: socket.userId });
          }
        }
      });
    } catch (error) {
      console.error("Error in handleChannelStopTyping:", error);
    }
  };

  // === CONNECTION HANDLER ===
  io.on("connection", (socket) => {
    try {
      const userId = socket.handshake.query.userId?.toString();
      socket.userId = userId;

      if (userId) {
        if (userSocketMap.has(userId)) {
          console.log(`User ${userId} reconnected. Removing old socket.`);
          userSocketMap.delete(userId);
        }

        userSocketMap.set(userId, socket.id);
        console.log(`User Connected: ${userId} with Socket ID: ${socket.id}`);
        console.log(`Active connections: ${userSocketMap.size}`);

        // Broadcast online status and send full online list to new client
        broadcastOnlineStatus(userId, true);
        socket.emit("online-users", getOnlineUsers());
      } else {
        console.log("User ID not provided during connection.");
      }

      socket.on("sendMessage", (message) => {
        try { sendMessage(message); }
        catch (error) { console.error(`Error in sendMessage handler: ${error.message}`); }
      });

      socket.on("send-channel-message", (message) => {
        try { sendChannelMessage(message); }
        catch (error) { console.error(`Error in send-channel-message handler: ${error.message}`); }
      });

      // Typing events
      socket.on("typing", (data) => {
        try { handleTyping(socket, data); }
        catch (error) { console.error(`Error in typing handler: ${error.message}`); }
      });

      socket.on("stop-typing", (data) => {
        try { handleStopTyping(socket, data); }
        catch (error) { console.error(`Error in stop-typing handler: ${error.message}`); }
      });

      socket.on("channel-typing", (data) => {
        try { handleChannelTyping(socket, data); }
        catch (error) { console.error(`Error in channel-typing handler: ${error.message}`); }
      });

      socket.on("channel-stop-typing", (data) => {
        try { handleChannelStopTyping(socket, data); }
        catch (error) { console.error(`Error in channel-stop-typing handler: ${error.message}`); }
      });

      socket.on("markMessagesAsRead", async (data) => {
        try {
          const { senderId, recipientId } = data; // recipientId is the current user marking messages as read
          // Update all unread messages from senderId to recipientId
          await Message.updateMany(
            { sender: senderId, recipient: recipientId, messageStatus: { $ne: "read" } },
            { $set: { messageStatus: "read" } }
          );

          // Notify the sender that their messages were read
          const senderSocketId = userSocketMap.get(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", {
              recipientId, // The person who read the messages
            });
          }
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });

      socket.on("get-online-users", () => {
        socket.emit("online-users", getOnlineUsers());
      });

      socket.on("disconnect", (reason) => {
        try {
          console.log(`Client Disconnected: ${socket.id}, Reason: ${reason}`);
          disconnect(socket);
        } catch (error) {
          console.error(`Error in disconnect handler: ${error.message}`);
        }
      });

      socket.on("error", (error) => {
        console.error(`Socket error for ${socket.id}: ${error.message}`);
      });
    } catch (error) {
      console.error(`Error during socket connection setup: ${error.message}`);
    }
  });
};

export default setupSocket;
