let fetch = require('node-fetch');

let handler = async (m, { command }) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear(); 
  m.reply(wait);
  try {
    let response = await fetch(`https://api-harilibur.vercel.app/api?month=${month}&year=${year}`);
    if (!response.ok) throw new Error('Gagal mengakses API');
    
    let res = await response.json();
    let content = `*L I B U R   N A S I O N A L*\n\n`;

    if (res.length > 0) {
      const holiday = res[0];
      content += `  ◦ *Tanggal:* ${holiday.holiday_date}\n`;
      content += `  ◦ *Nama Libur:* ${holiday.holiday_name}\n`;
      content += `  ◦ *Hari Nasional:* ${holiday.is_national_holiday ? 'Ya' : 'Tidak'}\n`;
    } else {
      content += 'Data libur tidak ditemukan.';
    }

    await m.reply(content);

  } catch (error) {
    console.error(error);
    m.reply('Terjadi kesalahan saat mengambil data libur.');
  }
};

handler.command = handler.help = ['libur', 'liburnasional']
handler.tags = ['tools'];
handler.limit = true;

module.exports = handler;
