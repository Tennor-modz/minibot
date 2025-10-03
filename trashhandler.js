const { initUserEnvIfMissing } = require("./settingsdb");

module.exports = async function trashhandler(socket, msg, store, command, args, sender) {
    try {
        // Make sure user env exists
        await initUserEnvIfMissing(sender);

        switch (command) {
            case "ping":
                await socket.sendMessage(sender, { text: "Pong! ✅" }, { quoted: msg });
                break;

            case "menu":
                await socket.sendMessage(sender, { text: "📜 Menu:\n1. Ping\n2. Menu" }, { quoted: msg });
                break;

            case "echo":
                await socket.sendMessage(sender, { text: args.join(" ") || "Nothing to echo." }, { quoted: msg });
                break;

            default:
                await socket.sendMessage(sender, { text: `❌ Unknown command: ${command}` }, { quoted: msg });
                break;
        }
    } catch (err) {
        console.error("Error in trashhandler:", err);
    }
};