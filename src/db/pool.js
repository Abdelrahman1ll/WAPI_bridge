const { Sequelize, DataTypes, Op } = require("sequelize");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const sequelize = new Sequelize(
  process.env.DB_NAME || "whatsapp",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// Define User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otp_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscription_plan: {
    type: DataTypes.STRING,
    defaultValue: 'free'
  },
  subscription_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  payment_status: {
    type: DataTypes.STRING,
    defaultValue: 'unpaid' // unpaid, pending, approved
  },
  token_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 100 // Default for free plan
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  api_key: {
    type: DataTypes.TEXT,
    unique: true,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Define WhatsAppSession Model
const WhatsAppSession = sequelize.define('WhatsAppSession', {
  session_name: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  key_id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'whatsapp_sessions',
  timestamps: false
});

// Define Message Model for Contact Form
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'unread' // unread, read, archived
  }
}, {
  tableName: 'messages',
  timestamps: true
});

module.exports = { sequelize, User, WhatsAppSession, Message, Op };
