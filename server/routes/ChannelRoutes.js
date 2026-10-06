import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  createChannel,
  getChannelMessages,
  getUserChannels,
  leaveChannel,
  getChannelInvites,
  acceptChannelInvite,
  rejectChannelInvite
} from "../controllers/ChannelController.js";

const channelRoutes = Router();

channelRoutes.post("/create-channel", verifyToken, createChannel);
channelRoutes.get("/get-user-channels", verifyToken, getUserChannels);
channelRoutes.get(
  "/get-channel-messages/:channelId",
  verifyToken,
  getChannelMessages
);
channelRoutes.delete("/leave-channel/:channelId", verifyToken, leaveChannel);
channelRoutes.get("/get-channel-invites", verifyToken, getChannelInvites);
channelRoutes.post("/accept-channel-invite", verifyToken, acceptChannelInvite);
channelRoutes.post("/reject-channel-invite", verifyToken, rejectChannelInvite);

export default channelRoutes;
