const chalk = require('chalk')
const fs = require('fs')
const Menu = `╭─⊷𝐓𝐑𝐀𝐒𝐇𝐂𝐎𝐑𝐄─
│▢ Owner:${global.ownername}
│▢ Version: 1.8.0
│▢ Type: ${global.typebot}
╰────────────
╭─⊷🐦‍🔥MAIN-CMD─
│ • menu                    
│ • ping
│ • ping2
│ • uptime 
│ • s
│ • botinfo
│ • listplugin 
│ • update 
╰────────────
╭─⊷🗿CTRL-BOT─
│ • public                    
│ • private
│ • addaccess
│ • delaccess    
│ • autoreact    
│ • block
│ • autotyping
│ • autorecord 
│ • autobio
│ • setprefix 
│ • autostatusview 
│ • onlygc
│ • onlypc
│ • >
│ • $
╰────────────
╭─⊷🏓MEDIA-CMD─
│ • play       
│ • playdoc       
│ • ytmp4 
│ • ytvid 
│ • yts 
│ • pinterestdl 
│ • vv
│ • song
│ • twitterdl
│ • tt
│ • tiktok  
│ • igdl      
│ • ytmp3      
╰────────────

╭─⊷🤖AI-CMD─
│ • gemma 
│ • copilot       
╰────────────
╭─⊷⚡GET-CMD─
│ • gethtml
│ • getpp 
│ • getplugin 
│ • save
│ • gitclone
│ • weather 
╰────────────
╭─⊷👥GRUP-CMD─
│ • add
│ • remove
│ • promote
│ • revoke
│ • approve
│ • reject
│ • antilinkgc
│ • antilink
│ • tagall
│ • hidetag
│ • close
│ • open
│ • kickall
│ • linkgc
│ • setppgc
│ • setdesc
│ • tagme
│ • warn
│ • unwarn
│ • welcome 
│ • goodbye 
│ • disp-1
│ • disp-7 
│ • disp-90 
│ • disp-off
╰────────────
╭─⊷⚓TOOL-CMD─
│ • enc
│ • idch 
│ • dev
╰────────────
╭─⊷🩸EPHOTO-CMD─
│ • glithtext
│ • lighteffects 
│ • writetext
│ • advancedglow
│ • typographytext
│ • pixelglitch
│ • neonglitch 
│ • flagtext
│ • flag3dtext
│ • deletingtext
│ • blackpinkstyle
│ • glowingtex
│ • underwater 
│ • logomaker
│ • cartoonstyle
│ • papercutstyle
│ • watercolortext
│ • effectclouds
│ • blackpinklogo
│ • gradienttext
│ • luxurygold
│ • sandsummer
│ • multicoloredneon
│ • galaxywallpaper 
│ • 1917style
│ • galaxystyle
│ • royaltext
│ • freecreate
╰────────────
╭─⊷🤠FUN-CMD─
│ • truth
│ • dare  
│ • cry
│ • kill
│ • happy
│ • hug
│ • lick
│ • pat
│ • bite
│ • kiss
│ • bully
│ • bonk
│ • poke
│ • slap
│ • wink
│ • dance
│ • cuddle
│ • cringe
│ • blush
│ • smile
│ • shinobu
│ • handhold
│ • highfive
│ • wave
│ • nom
│ • feed
│ • meow
│ • woof
│ • lizard
│ • spank
│ • tickle
│ • fox_girl
│ • avatar
│ • goose
│ • 8ball
│ • gecg
╰────────────
╭─⊷🏟️FUTBOL-CMD─
│ • epl
│ • laliga
│ • serie-a
│ • ligue-1
│ • bundesliga
╰────────────
> By Trashcore devs`

module.exports = Menu
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})
