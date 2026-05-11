const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const { WhatsAppSession } = require('../db/pool');

/**
 * Custom Auth State that saves data to PostgreSQL using Sequelize.
 */
async function usePostgresAuthState(pool, sessionName = 'default') {
    
    const writeData = async (key, data) => {
        const strData = JSON.stringify(data, BufferJSON.replacer);
        await WhatsAppSession.upsert({
            session_name: sessionName,
            key_id: key,
            data: strData
        });
    };

    const readData = async (key) => {
        const record = await WhatsAppSession.findOne({
            where: {
                session_name: sessionName,
                key_id: key
            }
        });
        
        if (record) {
            return JSON.parse(record.data, BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (key) => {
        await WhatsAppSession.destroy({
            where: {
                session_name: sessionName,
                key_id: key
            }
        });
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(key, value));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData('creds', creds)
    };
}

module.exports = { usePostgresAuthState };
