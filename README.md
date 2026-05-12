# WAPI Bridge - WhatsApp API Integration

A robust, multi-tenant WhatsApp integration system built with NestJS, Baileys, and PostgreSQL. This system allows users to link their WhatsApp accounts via QR code and send messages through a secure API.

## Features

- **Multi-tenant Architecture**: Support for multiple users, each with their own WhatsApp session.
- **Session Persistence**: Sessions are stored in a PostgreSQL database, ensuring they persist across server restarts.
- **Secure API**: JWT-based authentication for API access, with support for API keys.
- **Premium UI**: A beautiful, responsive dashboard with glassmorphism design.
- **Subscription Management**: Built-in support for different subscription plans with message limits.
- **Real-time Updates**: Socket.io integration for real-time connection status and QR code generation.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Abdelrahman1ll/WAPI_bridge.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=whatsapp
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   ```
4. Run the application:
   ```bash
   npm run dev
   ```

## API Usage

To send a message, use the following endpoint:

**Endpoint:** `POST /api/external/send/:userId`

**Headers:**
- `Authorization: Bearer YOUR_API_TOKEN`
- `Content-Type: application/json`

**Body:**
```json
{
  "phone": "201xxxxxxxxx",
  "message": "Hello from WAPI Bridge!"
}
```

## Dashboard

The dashboard provides a user-friendly interface to:
- Link/unlink WhatsApp accounts.
- View API credentials (User ID and Token).
- Monitor message usage and subscription status.

## License

This project is licensed under the MIT License.
