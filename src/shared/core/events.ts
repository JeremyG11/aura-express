import { EventEmitter } from "events";

export const events = new EventEmitter();

// Define Event Constants for DRY
export const MESSAGE_EVENTS = {
  CREATED: "message:created",
  UPDATED: "message:updated",
  DELETED: "message:deleted",
};

export const NOTIFICATION_EVENTS = {
  NEW: "notification:new",
};

export const REACTION_EVENTS = {
  ADDED: "reaction:added",
  REMOVED: "reaction:removed",
};

export const POLL_EVENTS = {
  VOTED: "poll:voted",
};
