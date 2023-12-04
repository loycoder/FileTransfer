import type { DEVICE_TYPE } from "./client";

const CLINT_EVENT_BASE = [
  "JOIN_ROOM",
  "LEAVE_ROOM",
  "SEND_OFFER",
  "SEND_ANSWER",
  "SEND_ICE",
] as const;
export type ClientEventKeys = typeof CLINT_EVENT_BASE[number];
export const CLINT_EVENT = CLINT_EVENT_BASE.reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {} as { [K in ClientEventKeys]: K }
);
const SERVER_EVENT_BASE = [
  "JOINED_ROOM",
  "JOINED_MEMBER",
  "LEFT_ROOM",
  "FORWARD_OFFER",
  "FORWARD_ANSWER",
  "FORWARD_ICE",
] as const;
export type ServerEventKeys = typeof SERVER_EVENT_BASE[number];
export const SERVER_EVENT = SERVER_EVENT_BASE.reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {} as { [K in ServerEventKeys]: K }
);
export interface SocketEventParams {
  // CLIENT
  [CLINT_EVENT.JOIN_ROOM]: {
    id: string;
    device: DEVICE_TYPE;
  };
  [CLINT_EVENT.LEAVE_ROOM]: {
    id: string;
  };
  [CLINT_EVENT.SEND_OFFER]: {
    origin: string;
    target: string;
    offer: RTCSessionDescriptionInit;
  };
  [CLINT_EVENT.SEND_ANSWER]: {
    origin: string;
    target: string;
    answer: RTCSessionDescriptionInit;
  };
  [CLINT_EVENT.SEND_ICE]: {
    origin: string;
    target: string;
    ice: RTCIceCandidateInit;
  };

  // SERVER
  [SERVER_EVENT.JOINED_ROOM]: {
    id: string;
    device: DEVICE_TYPE;
  };
  [SERVER_EVENT.JOINED_MEMBER]: {
    initialization: {
      id: string;
      device: DEVICE_TYPE;
    }[];
  };
  [SERVER_EVENT.LEFT_ROOM]: {
    id: string;
  };
  [SERVER_EVENT.FORWARD_OFFER]: {
    origin: string;
    target: string;
    offer: RTCSessionDescriptionInit;
  };
  [SERVER_EVENT.FORWARD_ANSWER]: {
    origin: string;
    target: string;
    answer: RTCSessionDescriptionInit;
  };
  [SERVER_EVENT.FORWARD_ICE]: {
    origin: string;
    target: string;
    ice: RTCIceCandidateInit;
  };
}

// TODO: CALLBACK
export type ClientFn<T extends ClientEventKeys> = (payload: SocketEventParams[T]) => void;
export type ClientHandler = { [K in ClientEventKeys]: ClientFn<K> };
export type ServerFn<T extends ServerEventKeys> = (payload: SocketEventParams[T]) => void;
export type ServerHandler = { [K in ServerEventKeys]: ServerFn<K> };
