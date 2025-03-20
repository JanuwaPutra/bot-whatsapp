global.owner = ['6289611858028']  
global.mods = ['6289611858028'] 
global.prems = ['6289611858028']
global.nameowner = 'Jaya'
global.numberowner = '6289611858028' 
global.mail = 'jaya@gmail.com' 
global.gc = 'gaada ini bot gratis dari jaya'
global.instagram = 'gaada ini bot gratis dari jaya'
global.wm = '© Jaya'
global.wait = '_*Tunggu sedang di proses...*_'
global.eror = '_*Server Error*_'
global.stiker_wait = '*⫹⫺ Stiker sedang dibuat...*'
global.packname = 'Made With Jaya Adi'
global.author = 'Jaya'
global.maxwarn = '5' // Peringatan maksimum Warn

global.autobio = false // Set true/false untuk mengaktifkan atau mematikan autobio (default: false)
global.antiporn = true // Set true/false untuk Auto delete pesan porno (bot harus admin) (default: true)
global.spam = false // Set true/false untuk anti spam (default: true)
global.gcspam = false // Set true/false untuk menutup grup ketika spam (default: false)
    

// APIKEY INI WAJIB DI ISI! //
global.btc = 'jayabot123' 
//Daftar terlebih dahulu https://api.botcahx.eu.org



// INI HANYA OPTIONAL SAJA BOLEH DI ISI BOLEH JUGA ENGGA //
global.lann = 'YOUR_APIKEY_HERE'
//Daftar https://api.betabotz.eu.org 

//Gausah diganti atau di ubah
global.APIs = {   
  btc: 'https://api.botcahx.eu.org'
}

//Gausah diganti atau di ubah
global.APIKeys = { 
  'https://api.botcahx.eu.org': global.btc
}


let fs = require('fs')
let chalk = require('chalk')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  delete require.cache[file]
  require(file)
})
