import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";

export const searchContacts = async (request, response) => {
  try {
    const { searchTerm } = request.body;

    if (searchTerm === undefined || searchTerm === null) {
      return response.status(400).json({ message: "searchTerm is required" });
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const regex = new RegExp(sanitizedSearchTerm, "i");

    // Exclude the currently logged-in user from results
    const rawContacts = await User.find({
      $and: [
        { _id: { $ne: request.userId } },
        { $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] },
      ],
    });

    const currentUser = await User.findById(request.userId);

    // Map contacts to include relationship status
    const contacts = rawContacts.map((contact) => {
      const contactObj = contact.toObject();
      let relationship = "none";
      
      if (currentUser.friends.includes(contact._id)) {
        relationship = "friend";
      } else if (currentUser.friendRequests.includes(contact._id)) {
        relationship = "incoming_request";
      } else if (currentUser.sentFriendRequests.includes(contact._id)) {
        relationship = "outgoing_request";
      }

      return {
        ...contactObj,
        relationship
      };
    });

    return response.status(200).json({ contacts });
  } catch (error) {
    console.error("Error in searchContacts:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const getContactsForDMList = async (request, response) => {
  try {
    let { userId } = request;
    userId = new mongoose.Types.ObjectId(userId);

    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { recipient: userId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$recipient",
              else: "$sender",
            },
          },
          lastMessageTime: { $first: "$timestamp" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      {
        $unwind: "$contactInfo",
      },
      {
        $project: {
          _id: 1,
          lastMessageTime: 1,
          email: "$contactInfo.email",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    return response.status(200).json({ contacts });
  } catch (error) {
    console.error("Error in getContactsForDMList:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const getAllContacts = async (request, response) => {
  try {
    const user = await User.find(
      { _id: { $ne: request.userId } }, //get all the user which are not the current loggedin user.
      "firstName lastName _id email"
    );

    const contacts = user.map((user) => ({
      label: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
      value: user._id,
    }));

    return response.status(200).json({ contacts });
  } catch (error) {
    console.error("Error in searchContacts:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const sendFriendRequest = async (request, response) => {
  try {
    const { targetId } = request.body;
    const userId = request.userId;

    if (!targetId) return response.status(400).json({ message: "Target user ID is required." });
    if (userId === targetId) return response.status(400).json({ message: "Cannot send request to yourself." });

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!targetUser) return response.status(404).json({ message: "User not found." });

    if (user.friends.includes(targetId)) return response.status(400).json({ message: "Already friends." });
    if (targetUser.friendRequests.includes(userId)) return response.status(400).json({ message: "Request already sent." });
    if (user.friendRequests.includes(targetId)) return response.status(400).json({ message: "This user already sent you a request. Accept it instead." });

    targetUser.friendRequests.push(userId);
    user.sentFriendRequests.push(targetId);

    await targetUser.save();
    await user.save();

    return response.status(200).json({ message: "Friend request sent." });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const acceptFriendRequest = async (request, response) => {
  try {
    const { targetId } = request.body;
    const userId = request.userId;

    if (!targetId) return response.status(400).json({ message: "Target user ID is required." });

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user.friendRequests.includes(targetId)) {
      return response.status(400).json({ message: "No friend request from this user." });
    }

    // Remove from requests
    user.friendRequests = user.friendRequests.filter(id => id.toString() !== targetId);
    targetUser.sentFriendRequests = targetUser.sentFriendRequests.filter(id => id.toString() !== userId);

    // Add to friends
    if (!user.friends.includes(targetId)) user.friends.push(targetId);
    if (!targetUser.friends.includes(userId)) targetUser.friends.push(userId);

    await user.save();
    await targetUser.save();

    return response.status(200).json({ message: "Friend request accepted.", friend: targetUser });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const rejectFriendRequest = async (request, response) => {
  try {
    const { targetId } = request.body;
    const userId = request.userId;

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== targetId);
    if (targetUser) {
      targetUser.sentFriendRequests = targetUser.sentFriendRequests.filter(id => id.toString() !== userId);
      await targetUser.save();
    }
    
    await user.save();

    return response.status(200).json({ message: "Friend request rejected." });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const removeFriend = async (request, response) => {
  try {
    const { targetId } = request.body;
    const userId = request.userId;

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    user.friends = user.friends.filter(id => id.toString() !== targetId);
    if (targetUser) {
      targetUser.friends = targetUser.friends.filter(id => id.toString() !== userId);
      await targetUser.save();
    }
    
    await user.save();

    return response.status(200).json({ message: "Friend removed." });
  } catch (error) {
    console.error("Error removing friend:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const getFriends = async (request, response) => {
  try {
    const user = await User.findById(request.userId).populate(
      "friends",
      "firstName lastName _id email image color"
    );
    return response.status(200).json({ friends: user.friends });
  } catch (error) {
    console.error("Error getting friends:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};

export const getFriendRequests = async (request, response) => {
  try {
    const user = await User.findById(request.userId)
      .populate("friendRequests", "firstName lastName _id email image color")
      .populate("sentFriendRequests", "firstName lastName _id email image color");
      
    return response.status(200).json({ 
      incoming: user.friendRequests,
      outgoing: user.sentFriendRequests
    });
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return response.status(500).json({ message: "Internal Server Error." });
  }
};
