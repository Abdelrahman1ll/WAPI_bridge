const {
  default: makeWASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers
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
    browser: Browsers.macOS("Desktop"),
    getMessage: async (key) => {
      return { conversation: "" };
    }
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
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        sessions.delete(userId); // Remove dead socket to create a new one
        connectWhatsApp(userId, io);
      } else {
        // Clear session from database
        const { WhatsAppSession } = require("../db/pool");
        WhatsAppSession.destroy({ where: { session_name: `session_${userId}` } }).catch(err => console.error(err));

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
