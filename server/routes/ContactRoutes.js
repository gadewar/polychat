import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  getAllContacts,
  getContactsForDMList,
  searchContacts,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests
} from "../controllers/ContactsController.js";

const contactsRoutes = Router();

contactsRoutes.post("/search", verifyToken, searchContacts);
contactsRoutes.get("/get-contacts-for-dm", verifyToken, getContactsForDMList);
contactsRoutes.get("/get-all-contacts", verifyToken, getAllContacts);

// Friend System Routes
contactsRoutes.post("/friend-request/send", verifyToken, sendFriendRequest);
contactsRoutes.post("/friend-request/accept", verifyToken, acceptFriendRequest);
contactsRoutes.post("/friend-request/reject", verifyToken, rejectFriendRequest);
contactsRoutes.post("/friend/remove", verifyToken, removeFriend);
contactsRoutes.get("/friends", verifyToken, getFriends);
contactsRoutes.get("/friend-requests", verifyToken, getFriendRequests);

export default contactsRoutes;
