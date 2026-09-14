import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const csvPath = process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

if (!csvPath) {
  throw new Error('Usage: npx tsx scripts/import-transactions.ts <csv-path>');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// 简易的 CSV 解析函数（纯原生，不依赖第三方包）
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // 简单的 CSV 行解析（处理逗号分隔）
  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, ''));
  };

  const headers = parseLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === headers.length) {
      const obj: Record<string, string> = {};
      headers.forEach((h, index) => {
        obj[h] = values[index];
      });
      records.push(obj);
    }
  }
  return records;
}

async function importTransactions() {
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(fileContent);

  console.log(`成功解析 ${records.length} 条记录，开始写入 Supabase...`);

  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map((row) => ({
      profile_id: row.uid,
      type: row.Type.toLowerCase(),
      amount: Math.abs(parseFloat(row.Amount || '0')),
      original_amount: parseFloat(row.Amount || '0'),
      description: row.Memo || '',
      date: new Date(row.Date).toISOString().split('T')[0],
      category: row.Category,
      original_currency: row.Currency || 'MYR',
      exchange_rate: 1.000000
    }));

    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error(`批次 ${i} 导入失败:`, error.message);
    } else {
      console.log(`已成功导入记录: ${i} 至 ${Math.min(i + batchSize, records.length)}`);
    }
  }
  console.log('所有交易数据导入完成！');
}

importTransactions();
