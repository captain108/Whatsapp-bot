const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const qrcode = require('qrcode-terminal');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({ version, auth: state });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('👉 Scan QR code with WhatsApp');
        }

        if (connection === 'close') {
            console.log('❌ Connection closed:', lastDisconnect.error);
        }

        if (connection === 'open') {
            console.log('✅ Bot connected');
        }
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        console.log('📩 New Message:', text);

        if (text === '!creategroup') {
            const participants = ['123456789@s.whatsapp.net']; // Replace with real numbers
            await sock.groupCreate('My Auto Group', participants);
            console.log('✅ Group Created');
        }

        if (text.startsWith('!changename ')) {
            const newName = text.split('!changename ')[1];
            await sock.groupUpdateSubject(from, newName);
            console.log('✅ Group name changed');
        }

        if (text.startsWith('!remove ')) {
            const target = text.split('!remove ')[1] + '@s.whatsapp.net';
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            console.log('✅ Removed member:', target);
        }

        if (text === '!getlink') {
            const groupMeta = await sock.groupInviteCode(from);
            await sock.sendMessage(from, { text: `https://chat.whatsapp.com/${groupMeta}` });
            console.log('✅ Sent Group Link');
        }
    });
}

startBot();
