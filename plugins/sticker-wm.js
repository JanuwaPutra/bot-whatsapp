const { sticker } = require('../lib/sticker')
const uploadFile = require('../lib/uploadFile')
const uploadImage = require('../lib/uploadImage')
let { webp2png } = require('../lib/webp2mp4')
let fetch = require("node-fetch")
const fs = require('fs')
const { spawn } = require('child_process')
const { tmpdir } = require('os')
const path = require('path')
const crypto = require('crypto')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let [packname, ...author] = text.split('|')
    author = (author || []).join('|')
    
    // Validasi input
    if (!packname) return m.reply(`Contoh penggunaan: ${usedPrefix + command} nama paket|nama pembuat`)
    
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    if (!/webp/.test(mime) && !/image/.test(mime) && !/video/.test(mime)) {
        return m.reply(`Balas stiker/gambar/video dengan perintah ${usedPrefix + command} nama paket|nama pembuat`)
    }
    
    if (/video/.test(mime) && ((q.msg || q).seconds > 11)) {
        return m.reply('Maksimal 10 detik!')
    }
    
    m.reply(stiker_wait || 'Sedang memproses stiker...')
    
    try {
        let media = await q.download()
        if (!media) throw 'Media tidak dapat diunduh'
        
        // Jika ini stiker, konversi ke PNG dulu menggunakan FFmpeg
        if (/webp/.test(mime)) {
            const tmpWebp = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
            const tmpPng = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.png`)
            
            fs.writeFileSync(tmpWebp, media)
            
            // Konversi WebP ke PNG menggunakan FFmpeg
            try {
                await new Promise((resolve, reject) => {
                    const ffmpeg = spawn('ffmpeg', [
                        '-i', tmpWebp,
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
                        tmpPng
                    ])
                    
                    ffmpeg.on('error', reject)
                    ffmpeg.on('close', (code) => {
                        if (code === 0) resolve()
                        else reject(new Error(`FFmpeg exited with code ${code}`))
                    })
                })
                
                media = fs.readFileSync(tmpPng)
                mime = 'image/png'
                
                // Bersihkan file temporary
                fs.unlinkSync(tmpWebp)
                fs.unlinkSync(tmpPng)
            } catch (ffmpegErr) {
                console.error('FFmpeg conversion error:', ffmpegErr)
                
                // Gunakan API alternatif jika gagal
                try {
                    // Hapus file temporary yang mungkin masih ada
                    if (fs.existsSync(tmpWebp)) fs.unlinkSync(tmpWebp)
                    if (fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng)
                    
                    const uploadedWebp = await uploadFile(media)
                    const api = await (await fetch(`https://api.botcahx.eu.org/api/tools/webp2png?url=${uploadedWebp}&apikey=${btc}`)).json()
                    
                    if (api && api.status && api.result) {
                        media = await (await fetch(api.result)).buffer()
                        mime = 'image/png'
                    } else {
                        throw new Error('API returned invalid response')
                    }
                } catch (apiErr) {
                    console.error('API conversion error:', apiErr)
                    throw 'Gagal mengkonversi stiker. API tidak merespons dengan benar.'
                }
            }
        }

        // Proses sebagai gambar atau video
        if (/image/.test(mime)) {
            try {
                const stiker = await conn.sendImageAsSticker(m.chat, media, m, { packname, author })
            } catch (imgErr) {
                console.error('Image sticker error:', imgErr)
                
                // Metode alternatif jika gagal
                const tmpFile = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
                
                try {
                    // Gunakan FFmpeg untuk mengkonversi langsung ke WebP
                    await new Promise((resolve, reject) => {
                        const ffmpeg = spawn('ffmpeg', [
                            '-i', '-',
                            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                            '-f', 'webp',
                            tmpFile
                        ])
                        
                        ffmpeg.stdin.write(media)
                        ffmpeg.stdin.end()
                        
                        ffmpeg.on('error', reject)
                        ffmpeg.on('close', (code) => {
                            if (code === 0) resolve()
                            else reject(new Error(`FFmpeg exited with code ${code}`))
                        })
                    })
                    
                    // Kirim stiker tanpa metadata
                    await conn.sendMessage(m.chat, { sticker: { url: tmpFile } }, { quoted: m })
                    fs.promises.unlink(tmpFile).catch(() => {})
                } catch (ffmpegErr) {
                    console.error('FFmpeg alternative error:', ffmpegErr)
                    throw 'Metode alternatif juga gagal. Coba lagi nanti.'
                }
            }
        } else if (/video/.test(mime)) {
            try {
                const stiker = await conn.sendVideoAsSticker(m.chat, media, m, { packname, author })
            } catch (vidErr) {
                console.error('Video sticker error:', vidErr)
                
                // Gunakan metode alternatif tanpa eksif jika gagal
                const tmpFile = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
                
                try {
                    // Gunakan FFmpeg dengan parameter yang dioptimalkan untuk animasi
                    await new Promise((resolve, reject) => {
                        const ffmpeg = spawn('ffmpeg', [
                            '-i', '-',
                            '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                            '-c:v', 'libwebp',
                            '-lossless', '0',
                            '-q:v', '80',
                            '-preset', 'default',
                            '-loop', '0',
                            '-an',
                            '-vsync', '0',
                            '-t', '6',
                            tmpFile
                        ])
                        
                        ffmpeg.stdin.write(media)
                        ffmpeg.stdin.end()
                        
                        ffmpeg.on('error', reject)
                        ffmpeg.on('close', (code) => {
                            if (code === 0) resolve()
                            else reject(new Error(`FFmpeg exited with code ${code}`))
                        })
                    })
                    
                    // Kirim stiker tanpa metadata
                    await conn.sendMessage(m.chat, { sticker: { url: tmpFile } }, { quoted: m })
                    fs.promises.unlink(tmpFile).catch(() => {})
                } catch (alternativeErr) {
                    console.error('Alternative method error:', alternativeErr)
                    throw 'Semua metode gagal. Coba lagi nanti.'
                }
            }
        }
    } catch (e) {
        console.error(e)
        m.reply(`Gagal membuat stiker: ${e.message}`)
    }
}

handler.help = ['wm <packname>|<author>']
handler.tags = ['sticker']
handler.command = /^(wm|watermark|take)$/i
handler.limit = true

module.exports = handler

const isUrl = (text) => {
  return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'))
}
