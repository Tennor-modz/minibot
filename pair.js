
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const { Octokit } = require('@octokit/rest');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const axios = require('axios');
const yts = require("yt-search");
const fetch = require("node-fetch");
const os = require('os');
const fg = require('api-dylux');
const chalk = require('chalk');
const cheerio = require('cheerio');
const nou = require('node-os-utils');
const didyoumean = require('didyoumean');
const similarity = require('similarity');
const speed = require('performance-now');
const { Sticker } = require('wa-sticker-formatter');
const { igdl } = require("btch-downloader");

// Custom imports
const { initUserEnvIfMissing } = require('./settingsdb');
const { initEnvsettings, getSetting } = require('./settings');
const handleCommand = require('./case');
const config = require('./config');
const { loadSettings } = require('./settingsManager');
global.settings = loadSettings();

const { 
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;

const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';
const otpStore = new Map();

if (!fs.existsSync(SESSION_BASE_PATH)) fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });

//======================== Helper Functions ========================
function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

function formatMessage(title, content, footer) {
    return `${title}\n\n${content}\n\n${footer}`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

//======================== Auto Features ========================
async function autoReadPrivate(socket, m) {
    try {
        const from = m.key.remoteJid;
        if (from.endsWith("@g.us")) return;
        if (!global.settings?.autoread?.enabled) return;
        await socket.readMessages([m.key]);
    } catch (err) {
        console.error("AutoRead Error:", err);
    }
}

async function autoRecordPrivate(socket, m) {
    try {
        const from = m.key.remoteJid;
        if (from.endsWith("@g.us")) return;
        if (!global.settings?.autorecord?.enabled) return;
        await socket.sendPresenceUpdate("recording", from);
    } catch (err) {
        console.error("AutoRecord Error:", err);
    }
}

async function autoTypingPrivate(socket, m) {
    try {
        const from = m.key.remoteJid;
        if (from.endsWith("@g.us")) return;
        if (!global.settings?.autotyping?.enabled) return;
        await socket.sendPresenceUpdate("composing", from);
    } catch (err) {
        console.error("AutoTyping Error:", err);
    }
}

//======================== GitHub Session Functions ========================
async function cleanDuplicateFiles(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({ owner, repo, path: 'session' });

        const sessionFiles = data.filter(file =>
            file.name.startsWith(`empire_${sanitizedNumber}_`) && file.name.endsWith('.json')
        ).sort((a, b) => {
            const timeA = parseInt(a.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            const timeB = parseInt(b.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            return timeB - timeA;
        });

        if (sessionFiles.length > 1) {
            for (let i = 1; i < sessionFiles.length; i++) {
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: `session/${sessionFiles[i].name}`,
                    message: `Delete duplicate session file for ${sanitizedNumber}`,
                    sha: sessionFiles[i].sha
                });
                console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }
    } catch (error) {
        console.error(`Failed to clean duplicate files for ${number}:`, error);
    }
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({ owner, repo, path: 'session' });
        const sessionFiles = data.filter(file => file.name === `creds_${sanitizedNumber}.json`);
        if (!sessionFiles.length) return null;

        const latestSession = sessionFiles[0];
        const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: `session/${latestSession.name}` });
        return JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    } catch (error) {
        console.error('Session restore failed:', error);
        return null;
    }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configPath = `session/config_${sanitizedNumber}.json`;
        let sha;

        try {
            const { data } = await octokit.repos.getContent({ owner, repo, path: configPath });
            sha = data.sha;
        } catch {}

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: configPath,
            message: `Update config for ${sanitizedNumber}`,
            content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
            sha
        });
        console.log(`Updated config for ${sanitizedNumber}`);
    } catch (error) {
        console.error('Failed to update config:', error);
        throw error;
    }
}

//======================== Socket Handlers ========================
function setupMessageHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        const botNumber = socket.user.id.split(":")[0] + "@s.whatsapp.net";

        // Determine body text
        let body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            msg.message.documentMessage?.caption || '';
        body = (body || '').trim();
        if (!body) return;

        // Wrap into m object
        const m = {
            ...msg,
            chat: from,
            sender,
            isGroup,
            body,
            type: Object.keys(msg.message)[0],
            quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                ? {
                    key: {
                        remoteJid: msg.message.extendedTextMessage.contextInfo.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    },
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                }
                : null,
            reply: (text) => socket.sendMessage(from, { text }, { quoted: msg })
        };

        const args = body.split(/ +/);
        const command = args.shift().toLowerCase();

        // Group info
        const groupMeta = isGroup ? await socket.groupMetadata(from).catch(() => null) : null;
        const groupAdmins = groupMeta ? groupMeta.participants.filter(p => p.admin).map(p => p.id) : [];
        const isBotAdmin = isGroup ? groupAdmins.includes(botNumber) : false;
        const isAdmin = isGroup ? groupAdmins.includes(sender) : false;

        // Run auto features
        await autoReadPrivate(socket, m);
        await autoRecordPrivate(socket, m);
        await autoTypingPrivate(socket, m);

        // Pass to command handler
        await handleCommand(socket, m, command, args, isGroup, isAdmin, groupAdmins, groupMeta, socket.decodeJid, config);
    });
}

function setupGroupUpdateHandlers(socket) {
    socket.ev.on('group-participants.update', async (update) => {
        try {
            const { id: chatId, participants, action } = update;
            const botNumber = socket.user.id.split(":")[0] + "@s.whatsapp.net";
            const settings = loadSettings();

            if ((action === 'promote' && settings.antipromote?.[chatId]?.enabled) ||
                (action === 'demote' && settings.antidemote?.[chatId]?.enabled)) {
                const groupSettings = (action === 'promote') ? settings.antipromote[chatId] : settings.antidemote[chatId];

                for (const user of participants) {
                    if (user === botNumber) continue;

                    await socket.sendMessage(chatId, {
                        text: `🚫 *${action === 'promote' ? 'Promotion' : 'Demotion'} Blocked!*\nUser: @${user.split('@')[0]}\nMode: ${groupSettings.mode.toUpperCase()}`,
                        mentions: [user],
                    });

                    if (groupSettings.mode === 'revert') {
                        await socket.groupParticipantsUpdate(chatId, [user], action === 'promote' ? 'demote' : 'promote');
                    } else if (groupSettings.mode === 'kick') {
                        await socket.groupParticipantsUpdate(chatId, [user], 'remove');
                    }
                }
            }
        } catch (err) {
            console.error('AntiPromote/AntiDemote error:', err);
        }
    });
}

//======================== Socket Utility ========================
function decodeJid(jid) {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const parts = jid.split(':');
        return `${parts[0]}@${parts[1].split('@')[1]}`;
    }
    return jid;
}

//======================== EmpirePair Function ========================
async function EmpirePair(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    await initUserEnvIfMissing(sanitizedNumber);
    await initEnvsettings(sanitizedNumber);

    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    await cleanDuplicateFiles(sanitizedNumber);
    const restoredCreds = await restoreSession(sanitizedNumber);
    if (restoredCreds) {
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
        console.log(`Successfully restored session for ${sanitizedNumber}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });

    try {
        const socket = makeWASocket({
            version: [2, 3000, 1025190524],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.macOS('Safari')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        setupMessageHandlers(socket);
        setupGroupUpdateHandlers(socket);

        // Handle creds updates
        socket.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            let sha;
            try {
                const { data } = await octokit.repos.getContent({ owner, repo, path: `session/creds_${sanitizedNumber}.json` });
                sha = data.sha;
            } catch {}
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: `session/creds_${sanitizedNumber}.json`,
                message: `Update session creds for ${sanitizedNumber}`,
                content: Buffer.from(fileContent).toString('base64'),
                sha
            });
            console.log(`Updated creds for ${sanitizedNumber} in GitHub`);
        });

        activeSockets.set(sanitizedNumber, socket);

        if (!socket.authState.creds.registered) {
            let retries = config.MAX_RETRIES;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    await delay(2000 * (config.MAX_RETRIES - retries));
                }
            }
            if (!res.headersSent) res.send({ code });
        }

    } catch (error) {
        console.error('Pairing error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) res.status(503).send({ error: 'Service Unavailable' });
    }
}

//======================== Express Routes ========================
router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).send({ error: 'Number parameter is required' });

    if (activeSockets.has(number.replace(/[^0-9]/g, ''))) {
        return res.status(200).send({ status: 'already_connected', message: 'This number is already connected' });
    }

    await EmpirePair(number, res);
});

router.get('/active', (req, res) => {
    res.status(200).send({ count: activeSockets.size, numbers: Array.from(activeSockets.keys()) });
});

router.get('/ping', (req, res) => {
    res.status(200).send({ status: 'active', message: 'BOT is running', activesession: activeSockets.size });
});

// Cleanup on exit
process.on('exit', () => {
    activeSockets.forEach(socket => socket.ws.close());
    fs.emptyDirSync(SESSION_BASE_PATH);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    exec(`pm2 restart ${process.env.PM2_NAME || 'BOT-session'}`);
});

module.exports = router;