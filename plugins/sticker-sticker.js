const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { fromBuffer } = require('file-type')
const { spawn } = require('child_process')

const tmp = path.join(__dirname, '../tmp')

if (!fs.existsSync(tmp)) {
  fs.mkdirSync(tmp, { recursive: true })
}

let handler = async (m, { conn, command, usedPrefix }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    if (/image/.test(mime)) {
      let media = await q.download()
      if (!media || media.length < 512) throw 'Media tidak valid atau terlalu kecil'
      
      // Validasi tipe file
      const fileType = await fromBuffer(media)
      if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
        throw 'Format file tidak didukung, gunakan JPG/PNG/WEBP'
      }

      m.reply(stiker_wait)
      
      // Gunakan pendekatan manual untuk konversi
      const randomId = crypto.randomBytes(6).readUIntLE(0, 6).toString(36)
      const inputFile = path.join(tmp, `${randomId}_input.${fileType.ext}`)
      const outputFile = path.join(tmp, `${randomId}_output.webp`)
      
      // Tulis file input
      await fs.promises.writeFile(inputFile, media)
      
      // Konversi manual menggunakan ffmpeg
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputFile,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
        '-f', 'webp',
        '-quality', '100',
        outputFile
      ])
      
      await new Promise((resolve, reject) => {
        ffmpeg.on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(new Error('Gagal konversi stiker'))
        })
        
        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg proses gagal dengan kode: ${code}`))
          } else {
            resolve()
          }
        })
      })
      
      // Kirim stiker tanpa EXIF dulu
      try {
        const webpBuffer = await fs.promises.readFile(outputFile)
        await conn.sendMessage(m.chat, { sticker: webpBuffer }, { quoted: m })
      } catch (stickerError) {
        console.error('Sticker sending error:', stickerError)
        throw `Gagal mengirim stiker: ${stickerError.message}`
      }
      
      // Bersihkan file temporary
      try {
        await fs.promises.unlink(inputFile)
        await fs.promises.unlink(outputFile)
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr)
      }
      
    } else if (/video/.test(mime)) {
      if ((q.msg || q).seconds > 7) return m.reply('Maksimal 6 detik!')
      
      let media = await q.download()
      if (!media || media.length < 1024) throw 'Video tidak valid atau terlalu kecil'
      
      m.reply(stiker_wait)
      
      // Gunakan pendekatan manual untuk konversi video
      const randomId = crypto.randomBytes(6).readUIntLE(0, 6).toString(36)
      const inputFile = path.join(tmp, `${randomId}_input.mp4`)
      const outputFile = path.join(tmp, `${randomId}_output.webp`)
      
      // Tulis file input
      await fs.promises.writeFile(inputFile, media)
      
      // Konversi manual dengan parameter khusus untuk animasi
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputFile,
        '-vf', 'fps=15,scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,format=rgba',
        '-c:v', 'libwebp',
        '-pix_fmt', 'yuva420p',
        '-framerate', '15',
        '-lossless', '0',
        '-quality', '75',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        '-shortest',
        '-y',
        outputFile
      ])
      
      await new Promise((resolve, reject) => {
        ffmpeg.on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(new Error('Gagal konversi stiker video'))
        })
        
        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg proses gagal dengan kode: ${code}`))
          } else {
            resolve()
          }
        })
      })
      
      // Kirim stiker tanpa EXIF dulu
      try {
        const webpBuffer = await fs.promises.readFile(outputFile)
        await conn.sendMessage(m.chat, { sticker: webpBuffer }, { quoted: m })
      } catch (stickerError) {
        console.error('Sticker sending error:', stickerError)
        throw `Gagal mengirim stiker: ${stickerError.message}`
      }
      
      // Bersihkan file temporary
      try {
        await fs.promises.unlink(inputFile)
        await fs.promises.unlink(outputFile)
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr)
      }
    } else {
      throw `Kirim Gambar/Video Dengan Caption ${usedPrefix + command}\nDurasi Video 1-6 Detik`
    }
  } catch (e) {
    console.error(e)
    m.reply(`Gagal membuat stiker: ${e.message}`)
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = /^(stiker|s|sticker)$/i
handler.limit = true
module.exports = handler

const isUrl = (text) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png|mp4)/, 'gi'))
}
