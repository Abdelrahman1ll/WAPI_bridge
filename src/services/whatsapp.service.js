const {
  default: makeWASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { usePostgresAuthState } = require("../utils/usePostgresAuthState");
const pino = require("pino");
const QRCode = require("qrcode");

const sessions = new Map();
const qrCodes = new Map();

async function connectWhatsApp(userId, io) {
  if (sessions.has(userId)) return sessions.get(userId);

  const { state, saveCreds } = await usePostgresAuthState(
    null,
    `session_${userId}`,
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
  });

  sessions.set(userId, sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (connection) console.log(`[WhatsApp: ${userId}] Status: ${connection}`);

    if (qr) {
      const qrData = await QRCode.toDataURL(qr);
      qrCodes.set(userId, qrData);
      io.to(`user_${userId}`).emit("qr", qrData);
    }

    if (connection === "connecting") {
      io.to(`user_${userId}`).emit("connecting", "جاري الاتصال...");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectWhatsApp(userId, io);
      } else {
        sessions.delete(userId);
        qrCodes.delete(userId);
        io.to(`user_${userId}`).emit("disconnected", "Logged out");
      }
    } else if (connection === "open") {
      qrCodes.delete(userId);
      io.to(`user_${userId}`).emit("connected", "WhatsApp Connected");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

const getSocket = (userId) => sessions.get(userId);
const getQr = (userId) => qrCodes.get(userId);
const isConnected = (userId) => (sessions.get(userId)?.user ? true : false);

module.exports = { connectWhatsApp, getSocket, getQr, isConnected };
