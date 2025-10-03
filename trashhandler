const { initUserEnvIfMissing } = require('./settingsdb');

module.exports = async function trashhandler(socket, m, chatUpdate, store) {
    try {
        // ✅ Make sure user data exists
        await initUserEnvIfMissing(m.sender);

        // ✅ Example: switch command handler
        if (!m.text) return;

        const command = m.text.trim().split(" ")[0].toLowerCase();

        switch (command) {
            case "ping":
                await socket.sendMessage(m.chat, { text: "Pong! ✅" }, { quoted: m });
                break;

            case "menu":
                await socket.sendMessage(m.chat, { text: "Here’s the menu 📝" }, { quoted: m });
                break;

            default:
                console.log("Unknown command:", command);
        }
    } catch (err) {
        console.error("Error in trashhandler:", err);
    }
};
